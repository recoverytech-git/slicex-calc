-- 0011 — Permissões por ação, cadastro atômico, fotos para vendedor e view de vendas.
-- Executar DEPOIS da 0010. Tudo em uma transação: se algo falhar, nada muda.

begin;

-- 1. Funções de permissão por AÇÃO (security definer: não dependem do RLS de veiculos)
create or replace function public.pode_editar_veiculo(p_veiculo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.veiculos v where v.id = p_veiculo and (
    (v.organizacao_id = public.minha_organizacao() and public.meu_papel() in ('proprietario','gerente'))
    or public.meu_papel() = 'admin_master'))
$$;

create or replace function public.pode_cadastrar_fotos(p_veiculo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.veiculos v where v.id = p_veiculo and (
    (v.organizacao_id = public.minha_organizacao() and public.meu_papel() in ('proprietario','gerente','vendedor'))
    or public.meu_papel() = 'admin_master'))
$$;

create or replace function public.normalizar_identificador(p text) returns text
language sql immutable as $$
  select nullif(regexp_replace(upper(coalesce(p, '')), '[\s.\-]', '', 'g'), '')
$$;

revoke execute on function public.pode_editar_veiculo(uuid), public.pode_cadastrar_fotos(uuid),
  public.normalizar_identificador(text) from public, anon;
grant execute on function public.pode_editar_veiculo(uuid), public.pode_cadastrar_fotos(uuid),
  public.normalizar_identificador(text) to authenticated;

-- 2. Recria as policies das tabelas do veículo (remove as anteriores antes)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public'
             and tablename in ('veiculos','veiculo_custos','veiculo_dados_financeiros','veiculo_financiamentos',
               'veiculo_financiamento_parcelas','veiculo_checklists','veiculo_vendas','veiculo_fotos','veiculo_historico')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Veículos: leitura para gestão; edição para lojista e gerente; exclusão só pelo administrador
create policy veiculos_select_gestao on public.veiculos for select to authenticated
  using (public.pode_ler_gestao(id));
create policy veiculos_update_editor on public.veiculos for update to authenticated
  using (public.pode_editar_veiculo(id)) with check (public.pode_editar_veiculo(id));
create policy veiculos_delete_admin on public.veiculos for delete to authenticated
  using (public.meu_papel() = 'admin_master');

-- Custos, dados financeiros, financiamento e checklist: leitura para gestão, escrita para editores
create policy custos_select on public.veiculo_custos for select to authenticated using (public.pode_ler_gestao(veiculo_id));
create policy custos_escrita on public.veiculo_custos for all to authenticated
  using (public.pode_editar_veiculo(veiculo_id)) with check (public.pode_editar_veiculo(veiculo_id));

create policy dados_fin_select on public.veiculo_dados_financeiros for select to authenticated using (public.pode_ler_gestao(veiculo_id));
create policy dados_fin_escrita on public.veiculo_dados_financeiros for all to authenticated
  using (public.pode_editar_veiculo(veiculo_id)) with check (public.pode_editar_veiculo(veiculo_id));

create policy financiamentos_select on public.veiculo_financiamentos for select to authenticated using (public.pode_ler_gestao(veiculo_id));
create policy financiamentos_escrita on public.veiculo_financiamentos for all to authenticated
  using (public.pode_editar_veiculo(veiculo_id)) with check (public.pode_editar_veiculo(veiculo_id));

create policy parcelas_select on public.veiculo_financiamento_parcelas for select to authenticated
  using (public.pode_ler_gestao((select f.veiculo_id from public.veiculo_financiamentos f where f.id = financiamento_id)));
create policy parcelas_escrita on public.veiculo_financiamento_parcelas for all to authenticated
  using (public.pode_editar_veiculo((select f.veiculo_id from public.veiculo_financiamentos f where f.id = financiamento_id)))
  with check (public.pode_editar_veiculo((select f.veiculo_id from public.veiculo_financiamentos f where f.id = financiamento_id)));

create policy checklists_select on public.veiculo_checklists for select to authenticated using (public.pode_ler_gestao(veiculo_id));
create policy checklists_escrita on public.veiculo_checklists for all to authenticated
  using (public.pode_editar_veiculo(veiculo_id)) with check (public.pode_editar_veiculo(veiculo_id));

-- Fotos: todos da organização veem; vendedor também envia no cadastro; só editores removem
create policy fotos_select on public.veiculo_fotos for select to authenticated using (public.pode_ver_veiculo(veiculo_id));
create policy fotos_insert on public.veiculo_fotos for insert to authenticated with check (public.pode_cadastrar_fotos(veiculo_id));
create policy fotos_update on public.veiculo_fotos for update to authenticated
  using (public.pode_editar_veiculo(veiculo_id)) with check (public.pode_editar_veiculo(veiculo_id));
create policy fotos_delete on public.veiculo_fotos for delete to authenticated using (public.pode_editar_veiculo(veiculo_id));

-- Vendas: leitura para gestão; registro só para lojista e administrador
create policy vendas_select on public.veiculo_vendas for select to authenticated using (public.pode_ler_gestao(veiculo_id));
create policy vendas_insert on public.veiculo_vendas for insert to authenticated with check (public.pode_gerir_veiculo(veiculo_id));

-- Histórico: leitura para gestão (escrita só por trigger)
create policy historico_select on public.veiculo_historico for select to authenticated using (public.pode_ler_gestao(veiculo_id));

-- 3. Fotos no Storage: a leitura não depende de o usuário conseguir ler a tabela veiculos
drop policy if exists "veiculos_fotos_ler_mesma_org" on storage.objects;
drop policy if exists "veiculos_fotos_enviar_gestao" on storage.objects;
drop policy if exists "veiculos_fotos_atualizar_gestao" on storage.objects;
drop policy if exists "veiculos_fotos_excluir_gestao" on storage.objects;
drop policy if exists "fotos_v2_ler" on storage.objects;
drop policy if exists "fotos_v2_enviar" on storage.objects;
drop policy if exists "fotos_v2_atualizar" on storage.objects;
drop policy if exists "fotos_v2_excluir" on storage.objects;

create policy fotos_v2_ler on storage.objects for select to authenticated
  using (bucket_id = 'veiculos-fotos' and public.pode_ver_veiculo(((storage.foldername(name))[2])::uuid));
create policy fotos_v2_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'veiculos-fotos' and public.pode_cadastrar_fotos(((storage.foldername(name))[2])::uuid));
create policy fotos_v2_atualizar on storage.objects for update to authenticated
  using (bucket_id = 'veiculos-fotos' and public.pode_editar_veiculo(((storage.foldername(name))[2])::uuid))
  with check (bucket_id = 'veiculos-fotos' and public.pode_editar_veiculo(((storage.foldername(name))[2])::uuid));
create policy fotos_v2_excluir on storage.objects for delete to authenticated
  using (bucket_id = 'veiculos-fotos' and public.pode_editar_veiculo(((storage.foldername(name))[2])::uuid));

-- 4. Cadastro atômico: veículo, custos, financiamento, parcelas e checklist em uma única transação
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
  -- Só o administrador pode escolher a loja; os demais usam a própria
  v_org := case when v_papel = 'admin_master' then coalesce((p_dados->>'organizacao_id')::uuid, v_org_caller)
                else v_org_caller end;
  if v_org is null then raise exception 'Organização não definida.'; end if;
  if coalesce(trim(p_dados->>'modelo'), '') = '' then raise exception 'Informe o modelo do veículo.'; end if;

  if exists (select 1 from public.veiculos v where v.organizacao_id = v_org and (
       (v_placa is not null and public.normalizar_identificador(v.placa) = v_placa)
    or (v_renavam is not null and public.normalizar_identificador(v.renavam) = v_renavam)
    or (v_chassi is not null and public.normalizar_identificador(v.chassi) = v_chassi))) then
    raise exception 'Já existe um veículo com esta placa, RENAVAM ou chassi.';
  end if;

  insert into public.veiculos (organizacao_id, modelo, placa, renavam, chassi, ano_fabricacao, ano_modelo, cor,
    quilometragem, combustivel, cambio, preco_compra, valor_fipe, preco_venda_pretendido, tipo_aquisicao, status, criado_por)
  values (v_org, trim(p_dados->>'modelo'), v_placa, v_renavam, v_chassi,
    nullif(p_dados->>'ano_fabricacao','')::int, nullif(p_dados->>'ano_modelo','')::int,
    nullif(p_dados->>'cor',''), nullif(p_dados->>'quilometragem','')::int,
    nullif(p_dados->>'combustivel',''), nullif(p_dados->>'cambio',''),
    nullif(p_dados->>'preco_compra','')::numeric, nullif(p_dados->>'valor_fipe','')::numeric,
    nullif(p_dados->>'preco_venda_pretendido','')::numeric,
    nullif(p_dados->>'tipo_aquisicao',''), 'em_preparacao', v_uid)
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
    insert into public.veiculo_checklists (veiculo_id, ipva_pago, licenciamento_em_dia, multas_verificadas,
      pneus_boas_condicoes, manual_disponivel, chave_reserva_disponivel, historico_manutencao_disponivel,
      documentacao_status, observacoes, atualizado_por)
    values (v_id, (p_checklist->>'ipva_pago')::boolean, (p_checklist->>'licenciamento_em_dia')::boolean,
      (p_checklist->>'multas_verificadas')::boolean, (p_checklist->>'pneus_boas_condicoes')::boolean,
      (p_checklist->>'manual_disponivel')::boolean, (p_checklist->>'chave_reserva_disponivel')::boolean,
      (p_checklist->>'historico_manutencao_disponivel')::boolean,
      coalesce(p_checklist->>'documentacao_status', 'nao_informado'), nullif(p_checklist->>'observacoes',''), v_uid);
  end if;

  return v_id;
end $$;

revoke execute on function public.cadastrar_veiculo(jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.cadastrar_veiculo(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- 5. Vendas com resultado final (a view respeita o RLS de quem consulta)
create or replace view public.v_vendas_resultado with (security_invoker = true) as
select v.id as veiculo_id, v.organizacao_id, v.modelo, v.placa,
  vd.id as venda_id, vd.data_venda, vd.valor_venda,
  coalesce(vd.despesas_venda, 0) as despesas_venda, coalesce(vd.descontos, 0) as descontos,
  coalesce(v.preco_compra, 0) as preco_compra,
  coalesce(c.total, 0) as custos_total,
  coalesce(f.total_juros, 0) as juros_total,
  coalesce(v.preco_compra, 0) + coalesce(c.total, 0) + coalesce(f.total_juros, 0) as investimento_total,
  vd.valor_venda - coalesce(vd.despesas_venda, 0) - coalesce(vd.descontos, 0)
    - (coalesce(v.preco_compra, 0) + coalesce(c.total, 0) + coalesce(f.total_juros, 0)) as resultado_final
from public.veiculos v
join public.veiculo_vendas vd on vd.veiculo_id = v.id
left join (select veiculo_id, sum(valor) as total from public.veiculo_custos group by veiculo_id) c on c.veiculo_id = v.id
left join public.veiculo_financiamentos f on f.veiculo_id = v.id;

grant select on public.v_vendas_resultado to authenticated;
revoke all on public.v_vendas_resultado from anon;

commit;
