-- 0025: juros e dias em estoque contados a partir da data de aquisicao (fallback: data de cadastro)
create or replace function public.juros_diario_veiculo(p_veiculo uuid, p_ate timestamptz default now())
returns numeric language sql stable as $$
  select case when f.quantidade_parcelas = 1 then
           greatest(floor(extract(epoch from (p_ate - coalesce(v.data_aquisicao::timestamptz, v.criado_em))) / 86400) - 30, 0)
           * (coalesce(f.total_juros, 0) / 30)
         else 0 end
  from public.veiculos v
  join public.veiculo_financiamentos f on f.veiculo_id = v.id
  where v.id = p_veiculo
$$;

create or replace view public.v_estoque_metricas with (security_invoker = true) as
select v.id as veiculo_id, v.organizacao_id,
  greatest(floor(extract(epoch from (now() - coalesce(v.data_aquisicao::timestamptz, v.criado_em))) / 86400), 0)::int as dias_em_estoque,
  coalesce(public.juros_diario_veiculo(v.id, now()), 0) as juros_diario_acumulado
from public.veiculos v
where v.status <> 'vendido';

grant select on public.v_estoque_metricas to authenticated;
revoke all on public.v_estoque_metricas from anon;

notify pgrst, 'reload schema';
