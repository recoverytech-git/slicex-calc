-- 0027: corrige veiculo_historico (tabela antiga ja existia sem as colunas usadas)
-- e registra quando a notificacao foi lida, para sair da lista apos 24 horas
create table if not exists public.veiculo_historico (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid references public.veiculos(id) on delete cascade,
  campo text,
  valor_anterior text,
  valor_novo text,
  alterado_por uuid,
  alterado_em timestamptz default now()
);

-- adiciona apenas o que falta; nao apaga dados da tabela antiga
alter table public.veiculo_historico
  add column if not exists veiculo_id uuid,
  add column if not exists campo text,
  add column if not exists valor_anterior text,
  add column if not exists valor_novo text,
  add column if not exists alterado_por uuid,
  add column if not exists alterado_em timestamptz default now();

-- colunas antigas obrigatorias que o novo registro nao preenche deixam de ser obrigatorias
do $$
declare r record;
begin
  for r in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'veiculo_historico' and is_nullable = 'NO'
      and column_name not in ('id', 'veiculo_id', 'campo', 'valor_anterior', 'valor_novo', 'alterado_por', 'alterado_em')
  loop
    execute format('alter table public.veiculo_historico alter column %I drop not null', r.column_name);
  end loop;
end $$;

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

-- notificacoes: data em que foi marcada como lida (preenchida automaticamente)
alter table public.notificacoes add column if not exists lida_em timestamptz;

create or replace function public.notificacao_marcar_lida_em()
returns trigger language plpgsql as $$
begin
  if new.lida and not coalesce(old.lida, false) then
    new.lida_em := now();
  end if;
  return new;
end $$;

drop trigger if exists notificacoes_lida_em on public.notificacoes;
create trigger notificacoes_lida_em before update of lida on public.notificacoes
  for each row execute function public.notificacao_marcar_lida_em();

notify pgrst, 'reload schema';
