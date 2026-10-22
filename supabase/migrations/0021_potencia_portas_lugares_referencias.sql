-- 1) Novos campos do veiculo: potencia do motor, portas e lugares
alter table public.veiculos add column if not exists potencia_motor text;
alter table public.veiculos add column if not exists portas int;
alter table public.veiculos add column if not exists lugares int;

-- 2) Cadastro de veiculo com os novos campos (demais regras iguais as da 0020)
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
  if coalesce(nullif(p_dados->>'valor_fipe','')::numeric, 0) <= 0 then
    raise exception 'Informe o valor FIPE do veículo.';
  end if;
  if coalesce(nullif(p_dados->>'preco_venda_pretendido','')::numeric, 0) <= 0 then
    raise exception 'Informe o valor de venda pretendido.';
  end if;

  if exists (select 1 from public.veiculos v where v.organizacao_id = v_org and (
       (v_placa is not null and public.normalizar_identificador(v.placa) = v_placa)
    or (v_renavam is not null and public.normalizar_identificador(v.renavam) = v_renavam)
    or (v_chassi is not null and public.normalizar_identificador(v.chassi) = v_chassi))) then
    raise exception 'Já existe um veículo com esta placa, RENAVAM ou chassi.';
  end if;

  insert into public.veiculos (organizacao_id, marca, modelo, placa, renavam, chassi, ano_fabricacao, ano_modelo, cor,
    quilometragem, combustivel, cambio, preco_compra, valor_fipe, preco_venda_pretendido, tipo_aquisicao, data_aquisicao,
    status, criado_por, numero_motor, categoria, potencia_motor, portas, lugares)
  values (v_org, nullif(trim(p_dados->>'marca'),''), trim(p_dados->>'modelo'), v_placa, v_renavam, v_chassi,
    nullif(p_dados->>'ano_fabricacao','')::int, nullif(p_dados->>'ano_modelo','')::int,
    nullif(p_dados->>'cor',''), nullif(p_dados->>'quilometragem','')::int,
    nullif(p_dados->>'combustivel',''), nullif(p_dados->>'cambio',''),
    nullif(p_dados->>'preco_compra','')::numeric, nullif(p_dados->>'valor_fipe','')::numeric,
    nullif(p_dados->>'preco_venda_pretendido','')::numeric,
    nullif(p_dados->>'tipo_aquisicao',''), (p_dados->>'data_aquisicao')::date, 'em_preparacao', v_uid,
    nullif(trim(p_dados->>'numero_motor'),''), nullif(trim(p_dados->>'categoria'),''),
    nullif(trim(p_dados->>'potencia_motor'),''), nullif(p_dados->>'portas','')::int, nullif(p_dados->>'lugares','')::int)
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

-- 3) Ficha financeira enviada pelo cliente: aceita as referencias pessoal e empresarial
create or replace function public.salvar_ficha_cliente(p_token text, p_dados jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_link public.fichas_links%rowtype;
  v_lead uuid; v_nome text; v_cpf text; v_tel text; v_filtrado jsonb;
  v_chaves text[] := array['nome','mae','rg','cpf','nascimento','telefone','estado_civil','email','cep',
    'endereco','numero','complemento','bairro','cidade','uf','tempo_residencia','cnh',
    'empresa','admissao','profissao','cargo','renda','renda_adicional','contato_empresa',
    'ref_pessoal_nome','ref_pessoal_tel','ref_emp_nome','ref_emp_tel'];
begin
  select * into v_link from public.fichas_links where token = p_token;
  if not found then raise exception 'Link inválido.'; end if;
  if v_link.status <> 'aberto' then raise exception 'Esta ficha já foi enviada. Obrigado!'; end if;
  if v_link.expira_em < now() then raise exception 'Este link expirou. Peça um novo ao atendente.'; end if;

  v_nome := trim(coalesce(p_dados->>'nome', ''));
  if v_nome = '' then raise exception 'Informe o nome completo.'; end if;
  v_cpf := regexp_replace(coalesce(p_dados->>'cpf', ''), '\D', '', 'g');
  if length(v_cpf) <> 11 then raise exception 'CPF incompleto.'; end if;
  v_tel := nullif(regexp_replace(coalesce(p_dados->>'telefone', ''), '\D', '', 'g'), '');

  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_filtrado
  from jsonb_each(p_dados) as e(key, value) where e.key = any(v_chaves);

  insert into public.leads (organizacao_id, criado_por, nome, cpf, telefone, dados, status, origem)
  values (v_link.organizacao_id, v_link.criado_por, v_nome, v_cpf, v_tel, v_filtrado, 'preenchida', 'link')
  returning id into v_lead;

  update public.fichas_links set status = 'preenchido', usado_em = now(), lead_id = v_lead where id = v_link.id;

  insert into public.notificacoes (usuario_id, titulo, mensagem, link_ref)
  select distinct d.uid, 'Ficha preenchida pelo cliente', v_nome || ' preencheu a ficha financeira.', v_lead
  from (
    select pf.id as uid from public.perfis pf
     where pf.organizacao_id = v_link.organizacao_id and pf.papel in ('proprietario','gerente') and pf.ativo
    union
    select v_link.criado_por where v_link.criado_por is not null
  ) d;
end $$;

revoke execute on function public.salvar_ficha_cliente(text, jsonb) from public;
grant execute on function public.salvar_ficha_cliente(text, jsonb) to anon, authenticated;
