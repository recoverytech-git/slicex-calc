-- 0024: juros diario apos o 30o dia (somente financiamento de 1 parcela)
-- regra: a contagem vai da aquisicao (criado_em) ate a venda (ou agora, se ainda estiver em estoque)
-- do dia 31 em diante, cada dia soma total_juros / 30

create or replace function public.juros_diario_veiculo(p_veiculo uuid, p_ate timestamptz default now())
returns numeric language sql stable as $$
  select case when f.quantidade_parcelas = 1 then
           greatest(floor(extract(epoch from (p_ate - v.criado_em)) / 86400) - 30, 0)
           * (coalesce(f.total_juros, 0) / 30)
         else 0 end
  from public.veiculos v
  join public.veiculo_financiamentos f on f.veiculo_id = v.id
  where v.id = p_veiculo
$$;

-- resultado das vendas passa a incluir o juros diario ate a data da venda
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
       + coalesce(public.juros_diario_veiculo(v.id, vd.data_venda::timestamptz), 0)) as resultado_final
from public.veiculos v
join public.veiculo_vendas vd on vd.veiculo_id = v.id
left join (select veiculo_id, sum(valor) as total from public.veiculo_custos group by veiculo_id) c on c.veiculo_id = v.id
left join public.veiculo_financiamentos f on f.veiculo_id = v.id;

grant select on public.v_vendas_resultado to authenticated;
revoke all on public.v_vendas_resultado from anon;

-- metricas do estoque: dias parado e juros diario acumulado ate hoje (veiculos nao vendidos)
create or replace view public.v_estoque_metricas with (security_invoker = true) as
select v.id as veiculo_id, v.organizacao_id,
  greatest(floor(extract(epoch from (now() - v.criado_em)) / 86400), 0)::int as dias_em_estoque,
  coalesce(public.juros_diario_veiculo(v.id, now()), 0) as juros_diario_acumulado
from public.veiculos v
where v.status <> 'vendido';

grant select on public.v_estoque_metricas to authenticated;
revoke all on public.v_estoque_metricas from anon;

notify pgrst, 'reload schema';
