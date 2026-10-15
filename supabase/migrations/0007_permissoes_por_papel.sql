-- 0007 — Permissões por papel. Executar DEPOIS de conferir as colunas de veiculos.
-- admin_master: tudo, em todas as organizações
-- proprietario (lojista): tudo da própria organização
-- gerente: lê tudo da própria organização, sem editar
-- vendedor: não lê veiculos nem financeiro; usa a view v_veiculos_vendedor
-- Tudo em uma transação: se algo falhar, nada é alterado.

begin;

-- 1. Funções auxiliares (security definer evita recursão de RLS)
create or replace function public.pode_ver_veiculo(p_veiculo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.veiculos v where v.id = p_veiculo
    and (v.organizacao_id = public.minha_organizacao() or public.meu_papel() = 'admin_master'))
$$;

create or replace function public.pode_ler_gestao(p_veiculo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.veiculos v where v.id = p_veiculo
    and ((v.organizacao_id = public.minha_organizacao() and public.meu_papel() in ('proprietario','gerente'))
         or public.meu_papel() = 'admin_master'))
$$;

create or replace function public.pode_gerir_veiculo(p_veiculo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.veiculos v where v.id = p_veiculo
    and ((v.organizacao_id = public.minha_organizacao() and public.meu_papel() = 'proprietario')
         or public.meu_papel() = 'admin_master'))
$$;

revoke execute on function public.pode_ver_veiculo(uuid), public.pode_ler_gestao(uuid), public.pode_gerir_veiculo(uuid) from public, anon;
grant execute on function public.pode_ver_veiculo(uuid), public.pode_ler_gestao(uuid), public.pode_gerir_veiculo(uuid) to authenticated;

-- 2. Privilégios de tabela: o RLS decide as linhas; aqui só o que o app precisa
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke truncate, trigger, references on all tables in schema public from authenticated;

-- 3. View do vendedor: só os campos básicos, filtrados pela própria organização
create or replace view public.v_veiculos_vendedor as
  select id, organizacao_id, modelo, ano_fabricacao, ano_modelo, quilometragem, preco_venda_pretendido, status
  from public.veiculos
  where organizacao_id = public.minha_organizacao();
grant select on public.v_veiculos_vendedor to authenticated;
revoke all on public.v_veiculos_vendedor from anon;

-- 4. Remove as policies atuais das tabelas do veículo (evita soma de permissões)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public'
             and tablename in ('veiculos','veiculo_checklists','veiculo_custos','veiculo_dados_financeiros',
               'veiculo_financiamentos','veiculo_financiamento_parcelas','veiculo_fotos','veiculo_historico',
               'veiculo_vendas','organizacoes','perfis')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 5. Veículos
create policy veiculos_select_gestao on public.veiculos for select to authenticated
  using (public.meu_papel() in ('proprietario','gerente','admin_master')
         and (organizacao_id = public.minha_organizacao() or public.meu_papel() = 'admin_master'));
create policy veiculos_insert_proprietario on public.veiculos for insert to authenticated
  with check ((public.meu_papel() = 'proprietario' and organizacao_id = public.minha_organizacao())
              or public.meu_papel() = 'admin_master');
create policy veiculos_update_proprietario on public.veiculos for update to authenticated
  using ((public.meu_papel() = 'proprietario' and organizacao_id = public.minha_organizacao())
         or public.meu_papel() = 'admin_master')
  with check ((public.meu_papel() = 'proprietario' and organizacao_id = public.minha_organizacao())
              or public.meu_papel() = 'admin_master');
create policy veiculos_delete_admin on public.veiculos for delete to authenticated
  using (public.meu_papel() = 'admin_master');

-- 6. Tabelas financeiras e operacionais: leitura para gestão, escrita para o lojista
create policy custos_select on public.veiculo_custos for select to authenticated using (public.pode_ler_gestao(veiculo_id));
create policy custos_insert on public.veiculo_custos for insert to authenticated with check (public.pode_gerir_veiculo(veiculo_id));
create policy custos_update on public.veiculo_custos for update to authenticated using (public.pode_gerir_veiculo(veiculo_id)) with check (public.pode_gerir_veiculo(veiculo_id));

create policy dados_fin_select on public.veiculo_dados_financeiros for select to authenticated using (public.pode_ler_gestao(veiculo_id));
create policy dados_fin_insert on public.veiculo_dados_financeiros for insert to authenticated with check (public.pode_gerir_veiculo(veiculo_id));
create policy dados_fin_update on public.veiculo_dados_financeiros for update to authenticated using (public.pode_gerir_veiculo(veiculo_id)) with check (public.pode_gerir_veiculo(veiculo_id));

create policy financiamentos_select on public.veiculo_financiamentos for select to authenticated using (public.pode_ler_gestao(veiculo_id));
create policy financiamentos_insert on public.veiculo_financiamentos for insert to authenticated with check (public.pode_gerir_veiculo(veiculo_id));
create policy financiamentos_update on public.veiculo_financiamentos for update to authenticated using (public.pode_gerir_veiculo(veiculo_id)) with check (public.pode_gerir_veiculo(veiculo_id));

create policy parcelas_select on public.veiculo_financiamento_parcelas for select to authenticated
  using (public.pode_ler_gestao((select f.veiculo_id from public.veiculo_financiamentos f where f.id = financiamento_id)));
create policy parcelas_insert on public.veiculo_financiamento_parcelas for insert to authenticated
  with check (public.pode_gerir_veiculo((select f.veiculo_id from public.veiculo_financiamentos f where f.id = financiamento_id)));
create policy parcelas_update on public.veiculo_financiamento_parcelas for update to authenticated
  using (public.pode_gerir_veiculo((select f.veiculo_id from public.veiculo_financiamentos f where f.id = financiamento_id)))
  with check (public.pode_gerir_veiculo((select f.veiculo_id from public.veiculo_financiamentos f where f.id = financiamento_id)));

create policy checklists_select on public.veiculo_checklists for select to authenticated using (public.pode_ler_gestao(veiculo_id));
create policy checklists_insert on public.veiculo_checklists for insert to authenticated with check (public.pode_gerir_veiculo(veiculo_id));
create policy checklists_update on public.veiculo_checklists for update to authenticated using (public.pode_gerir_veiculo(veiculo_id)) with check (public.pode_gerir_veiculo(veiculo_id));

create policy vendas_select on public.veiculo_vendas for select to authenticated using (public.pode_ler_gestao(veiculo_id));
create policy vendas_insert on public.veiculo_vendas for insert to authenticated with check (public.pode_gerir_veiculo(veiculo_id));

create policy historico_select on public.veiculo_historico for select to authenticated using (public.pode_ler_gestao(veiculo_id));

-- 7. Fotos: qualquer um da organização vê (inclusive vendedor); só o lojista envia e remove
create policy fotos_select on public.veiculo_fotos for select to authenticated using (public.pode_ver_veiculo(veiculo_id));
create policy fotos_insert on public.veiculo_fotos for insert to authenticated with check (public.pode_gerir_veiculo(veiculo_id));
create policy fotos_update on public.veiculo_fotos for update to authenticated using (public.pode_gerir_veiculo(veiculo_id)) with check (public.pode_gerir_veiculo(veiculo_id));
create policy fotos_delete on public.veiculo_fotos for delete to authenticated using (public.pode_gerir_veiculo(veiculo_id));

-- 8. Organizações e perfis
create policy organizacoes_select on public.organizacoes for select to authenticated
  using (id = public.minha_organizacao() or public.meu_papel() = 'admin_master');
create policy organizacoes_insert_admin on public.organizacoes for insert to authenticated
  with check (public.meu_papel() = 'admin_master');
create policy organizacoes_update_admin on public.organizacoes for update to authenticated
  using (public.meu_papel() = 'admin_master') with check (public.meu_papel() = 'admin_master');

create policy perfis_select on public.perfis for select to authenticated
  using (id = auth.uid() or public.meu_papel() = 'admin_master'
         or (public.meu_papel() = 'proprietario' and organizacao_id = public.minha_organizacao()));
create policy perfis_insert on public.perfis for insert to authenticated
  with check (public.meu_papel() = 'admin_master'
    or (public.meu_papel() = 'proprietario' and organizacao_id = public.minha_organizacao() and papel in ('gerente','vendedor')));
create policy perfis_update on public.perfis for update to authenticated
  using (public.meu_papel() = 'admin_master'
    or (public.meu_papel() = 'proprietario' and organizacao_id = public.minha_organizacao() and papel in ('gerente','vendedor')))
  with check (public.meu_papel() = 'admin_master'
    or (public.meu_papel() = 'proprietario' and organizacao_id = public.minha_organizacao() and papel in ('gerente','vendedor')));

commit;
