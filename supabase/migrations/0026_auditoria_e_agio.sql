-- 0026: preco pretendido na view de vendas (agio) e historico de alteracoes (auditoria)

create or replace view public.v_vendas_resultado with (security_invoker = true) as
select v.id as veiculo_id, v.organizacao_id, v.modelo, v.placa,
  vd.id as venda_id, vd.data_venda, vd.valor_venda,
  coalesce(vd.despesas_venda, 0) as despesas_venda, coalesce(vd.descontos, 0) as descontos,
  coalesce(v.preco_compra, 0) as preco_compra,
  coalesce(c.total, 0) as custos_total,
  coalesce(f.total_juros, 0) + coalesce(public.juros_diario_veiculo(v.id, vd.data_venda::timestamptz), 0) as juros_total,
  coalesce(v.preco_compra, 0) + coalesce(c.total, 0) + coalesce(f.total_juros, 0)
    + coalesce(public.juros_diario_veiculo(v.id, vd.data_venda::timestamptz), 0) as investimento_total,
  vd.valor_venda - coalesce(vd.despesas_venda, 0) - coalesce(vd.descontos, 0)
    - (coalesce(v.preco_compra, 0) + coalesce(c.total, 0) + coalesce(f.total_juros, 0)
       + coalesce(public.juros_diario_veiculo(v.id, vd.data_venda::timestamptz), 0)) as resultado_final,
  coalesce(v.preco_venda_pretendido, 0) as preco_venda_pretendido
from public.veiculos v
join public.veiculo_vendas vd on vd.veiculo_id = v.id
left join (select veiculo_id, sum(valor) as total from public.veiculo_custos group by veiculo_id) c on c.veiculo_id = v.id
left join public.veiculo_financiamentos f on f.veiculo_id = v.id;

grant select on public.v_vendas_resultado to authenticated;
revoke all on public.v_vendas_resultado from anon;

create table if not exists public.veiculo_historico (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos(id) on delete cascade,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  alterado_por uuid,
  alterado_em timestamptz not null default now()
);

alter table public.veiculo_historico enable row level security;

drop policy if exists historico_select on public.veiculo_historico;
create policy historico_select on public.veiculo_historico for select to authenticated
  using (exists (select 1 from public.veiculos v where v.id = veiculo_historico.veiculo_id));

revoke all on public.veiculo_historico from anon;
grant select on public.veiculo_historico to authenticated;

create or replace function public.registrar_historico_veiculo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.veiculo_historico (veiculo_id, campo, valor_anterior, valor_novo, alterado_por)
    values (new.id, 'status', old.status, new.status, auth.uid());
  end if;
  if new.preco_venda_pretendido is distinct from old.preco_venda_pretendido then
    insert into public.veiculo_historico (veiculo_id, campo, valor_anterior, valor_novo, alterado_por)
    values (new.id, 'preco_venda_pretendido', old.preco_venda_pretendido::text, new.preco_venda_pretendido::text, auth.uid());
  end if;
  if new.preco_compra is distinct from old.preco_compra then
    insert into public.veiculo_historico (veiculo_id, campo, valor_anterior, valor_novo, alterado_por)
    values (new.id, 'preco_compra', old.preco_compra::text, new.preco_compra::text, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists veiculos_historico on public.veiculos;
create trigger veiculos_historico after update on public.veiculos
  for each row execute function public.registrar_historico_veiculo();

notify pgrst, 'reload schema';
