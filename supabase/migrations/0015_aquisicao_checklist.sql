-- 0015 — Data de aquisição do veículo (obrigatória no cadastro) e 8 novos itens do checklist.
-- Executar DEPOIS da 0014. Tudo em uma transação.

begin;

alter table public.veiculos add column if not exists data_aquisicao date;

alter table public.veiculo_checklists add column if not exists direcao_eletrica boolean;
alter table public.veiculo_checklists add column if not exists vidros_eletricos boolean;
alter table public.veiculo_checklists add column if not exists travas_eletricas boolean;
alter table public.veiculo_checklists add column if not exists ar_condicionado boolean;
alter table public.veiculo_checklists add column if not exists rodas_liga_leve boolean;
alter table public.veiculo_checklists add column if not exists multimidia boolean;
alter table public.veiculo_checklists add column if not exists bancos_couro boolean;
alter table public.veiculo_checklists add column if not exists airbag boolean;

create or replace function public.cadastrar_veiculo(
  p_dados jsonb, p_custos jsonb default '[]'::jsonb, p_financiamento jsonb default null,
  p_parcelas jsonb default '[]'::jsonb, p_checklist jsonb default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_papel text; v_org_caller uuid; v_org uuid; v_id uuid; v_fin uuid;
  v_placa text := public.normalizar_identificador(p_dados->>'placa');
  v_renavam text := public.normalizar_identificador(p_dados->>'renavam');
  v_chassi text := public.normalizar_identificador(p_dados->>'chassi');
begin
  select pf.papel, pf.organizacao_id into v_papel, v_org_caller
    from public.perfis pf where pf.id = v_uid and pf.ativo;
  if v_papel is null or v_papel not in ('admin_master','proprietario','gerente','vendedor') then
    raise exception 'Sem permissão para cadastrar veículos.';
  end if;
  v_org := case when v_papel = 'admin_master' then coalesce((p_dados->>'organizacao_id')::uuid, v_org_caller)
                else v_org_caller end;
  if v_org is null then raise exception 'Organização não definida.'; end if;
  if coalesce(trim(p_dados->>'modelo'), '') = '' then raise exception 'Informe o modelo do veículo.'; end if;
  if nullif(p_dados->>'data_aquisicao', '') is null then
    raise exception 'Informe a data de aquisição do veículo.';
  end if;

  if exists (select 1 from public.veiculos v where v.organizacao_id = v_org and (
       (v_placa is not null and public.normalizar_identificador(v.placa) = v_placa)
    or (v_renavam is not null and public.normalizar_identificador(v.renavam) = v_renavam)
    or (v_chassi is not null and public.normalizar_identificador(v.chassi) = v_chassi))) then
    raise exception 'Já existe um veículo com esta placa, RENAVAM ou chassi.';
  end if;

  insert into public.veiculos (organizacao_id, marca, modelo, placa, renavam, chassi, ano_fabricacao, ano_modelo, cor,
    quilometragem, combustivel, cambio, preco_compra, valor_fipe, preco_venda_pretendido, tipo_aquisicao, data_aquisicao, status, criado_por)
  values (v_org, nullif(trim(p_dados->>'marca'),''), trim(p_dados->>'modelo'), v_placa, v_renavam, v_chassi,
    nullif(p_dados->>'ano_fabricacao','')::int, nullif(p_dados->>'ano_modelo','')::int,
    nullif(p_dados->>'cor',''), nullif(p_dados->>'quilometragem','')::int,
    nullif(p_dados->>'combustivel',''), nullif(p_dados->>'cambio',''),
    nullif(p_dados->>'preco_compra','')::numeric, nullif(p_dados->>'valor_fipe','')::numeric,
    nullif(p_dados->>'preco_venda_pretendido','')::numeric,
    nullif(p_dados->>'tipo_aquisicao',''), (p_dados->>'data_aquisicao')::date, 'em_preparacao', v_uid)
  returning id into v_id;

  insert into public.veiculo_custos (veiculo_id, descricao, valor, criado_por)
  select v_id, c->>'descricao', (c->>'valor')::numeric, v_uid
  from jsonb_array_elements(coalesce(p_custos, '[]'::jsonb)) c;

  if p_financiamento is not null then
    insert into public.veiculo_financiamentos (veiculo_id, valor_financiado, taxa_juros_percentual, periodicidade_taxa,
      quantidade_parcelas, sistema_amortizacao, valor_parcela, total_juros, dados_calculo, criado_por)
    values (v_id, (p_financiamento->>'valor_financiado')::numeric, (p_financiamento->>'taxa')::numeric, 'mensal',
      (p_financiamento->>'prazo')::int, p_financiamento->>'sistema', (p_financiamento->>'valor_parcela')::numeric,
      (p_financiamento->>'total_juros')::numeric, coalesce(p_financiamento->'dados_calculo', '{}'::jsonb), v_uid)
    returning id into v_fin;

    insert into public.veiculo_financiamento_parcelas (financiamento_id, parcela_numero, valor_parcela, amortizacao, juros, saldo_devedor)
    select v_fin, (x->>'mes')::int, (x->>'parcela')::numeric, (x->>'amortizacao')::numeric,
           (x->>'juros')::numeric, (x->>'saldo')::numeric
    from jsonb_array_elements(coalesce(p_parcelas, '[]'::jsonb)) x;
  end if;

  if p_checklist is not null then
    insert into public.veiculo_checklists (veiculo_id, direcao_eletrica, vidros_eletricos, travas_eletricas,
      ar_condicionado, rodas_liga_leve, multimidia, bancos_couro, airbag,
      ipva_pago, licenciamento_em_dia, multas_verificadas,
      pneus_boas_condicoes, manual_disponivel, chave_reserva_disponivel, historico_manutencao_disponivel,
      documentacao_status, observacoes, atualizado_por)
    values (v_id,
      (p_checklist->>'direcao_eletrica')::boolean, (p_checklist->>'vidros_eletricos')::boolean,
      (p_checklist->>'travas_eletricas')::boolean, (p_checklist->>'ar_condicionado')::boolean,
      (p_checklist->>'rodas_liga_leve')::boolean, (p_checklist->>'multimidia')::boolean,
      (p_checklist->>'bancos_couro')::boolean, (p_checklist->>'airbag')::boolean,
      (p_checklist->>'ipva_pago')::boolean, (p_checklist->>'licenciamento_em_dia')::boolean,
      (p_checklist->>'multas_verificadas')::boolean, (p_checklist->>'pneus_boas_condicoes')::boolean,
      (p_checklist->>'manual_disponivel')::boolean, (p_checklist->>'chave_reserva_disponivel')::boolean,
      (p_checklist->>'historico_manutencao_disponivel')::boolean,
      coalesce(p_checklist->>'documentacao_status', 'nao_informado'), nullif(p_checklist->>'observacoes',''), v_uid);
  end if;

  return v_id;
end $$;

revoke execute on function public.cadastrar_veiculo(jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.cadastrar_veiculo(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

commit;
