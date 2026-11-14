-- 0028: juros efetivo na venda (dias realmente usados) e validacao da data da venda
-- regra (1 parcela): ate 30 dias -> juros x dias / 30; do dia 31 em diante -> + (dias - 30) x juros / 30

create or replace function public.juros_efetivo_venda(p_veiculo uuid, p_data timestamptz)
returns numeric language plpgsql stable as $$
declare
  j numeric;
  parc int;
  ini date;
  d int;
begin
  select f.total_juros, f.quantidade_parcelas, coalesce(v.data_aquisicao::date, v.criado_em::date)
    into j, parc, ini
  from public.veiculos v
  join public.veiculo_financiamentos f on f.veiculo_id = v.id
  where v.id = p_veiculo;
  if not found then return 0; end if;
  j := coalesce(j, 0);
  if parc is distinct from 1 then return j; end if;
  d := greatest(p_data::date - ini, 0);
  if d <= 30 then return j * d / 30.0; end if;
  return j + (d - 30) * j / 30.0;
end $$;

-- resultado das vendas: juros ajustado pela data real da venda
create or replace view public.v_vendas_resultado with (security_invoker = true) as
select v.id as veiculo_id, v.organizacao_id, v.modelo, v.placa,
  vd.id as venda_id, vd.data_venda, vd.valor_venda,
  coalesce(vd.despesas_venda, 0) as despesas_venda, coalesce(vd.descontos, 0) as descontos,
  coalesce(v.preco_compra, 0) as preco_compra,
  coalesce(c.total, 0) as custos_total,
  coalesce(public.juros_efetivo_venda(v.id, vd.data_venda::timestamptz), 0) as juros_total,
  coalesce(v.preco_compra, 0) + coalesce(c.total, 0)
    + coalesce(public.juros_efetivo_venda(v.id, vd.data_venda::timestamptz), 0) as investimento_total,
  vd.valor_venda - coalesce(vd.despesas_venda, 0) - coalesce(vd.descontos, 0)
    - (coalesce(v.preco_compra, 0) + coalesce(c.total, 0)
       + coalesce(public.juros_efetivo_venda(v.id, vd.data_venda::timestamptz), 0)) as resultado_final,
  coalesce(v.preco_venda_pretendido, 0) as preco_venda_pretendido
from public.veiculos v
join public.veiculo_vendas vd on vd.veiculo_id = v.id
left join (select veiculo_id, sum(valor) as total from public.veiculo_custos group by veiculo_id) c on c.veiculo_id = v.id;

grant select on public.v_vendas_resultado to authenticated;
revoke all on public.v_vendas_resultado from anon;

-- data da venda: nao pode ser futura nem anterior a aquisicao
create or replace function public.validar_data_venda()
returns trigger language plpgsql as $$
declare
  aq date;
begin
  select coalesce(v.data_aquisicao, v.criado_em::date) into aq
  from public.veiculos v where v.id = new.veiculo_id;
  if new.data_venda::date > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'A data da venda não pode ser futura.';
  end if;
  if aq is not null and new.data_venda::date < aq then
    raise exception 'A data da venda não pode ser anterior à data de aquisição.';
  end if;
  return new;
end $$;

drop trigger if exists veiculo_vendas_valida_data on public.veiculo_vendas;
create trigger veiculo_vendas_valida_data
  before insert or update of data_venda on public.veiculo_vendas
  for each row execute function public.validar_data_venda();

notify pgrst, 'reload schema';
