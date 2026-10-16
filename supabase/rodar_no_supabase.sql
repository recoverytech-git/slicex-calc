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


-- 9. Gestão de usuários em SQL (sem Edge Function)
create or replace function public.admin_listar_usuarios()
returns table (id uuid, nome text, email text, papel text, ativo boolean, organizacao_id uuid, organizacao_nome text)
language plpgsql stable security definer set search_path = public, auth as $$
declare v_papel text; v_org uuid;
begin
  select pf.papel, pf.organizacao_id into v_papel, v_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_papel is null or v_papel not in ('admin_master','proprietario') then
    raise exception 'Sem permissão.';
  end if;
  return query
    select pf.id, pf.nome, u.email::text, pf.papel, pf.ativo, pf.organizacao_id, og.nome
    from public.perfis pf
    join auth.users u on u.id = pf.id
    left join public.organizacoes og on og.id = pf.organizacao_id
    where v_papel = 'admin_master'
       or (pf.organizacao_id = v_org and pf.papel <> 'admin_master')
    order by pf.nome;
end $$;

create or replace function public.admin_criar_usuario(
  p_email text, p_senha text, p_nome text, p_papel text,
  p_organizacao uuid default null, p_nome_loja text default null)
returns uuid
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_caller_papel text; v_caller_org uuid; v_org uuid; v_id uuid; v_instancia uuid;
begin
  select pf.papel, pf.organizacao_id into v_caller_papel, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_caller_papel is null or v_caller_papel not in ('admin_master','proprietario') then
    raise exception 'Sem permissão.';
  end if;
  if p_email is null or p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'E-mail inválido.';
  end if;
  if p_senha is null or length(p_senha) < 8 then
    raise exception 'A senha deve ter pelo menos 8 caracteres.';
  end if;
  if p_papel not in ('admin_master','proprietario','gerente','vendedor') then
    raise exception 'Papel inválido.';
  end if;
  if exists (select 1 from auth.users where email = lower(p_email)) then
    raise exception 'Já existe um usuário com este e-mail.';
  end if;

  if v_caller_papel = 'proprietario' then
    if p_papel not in ('gerente','vendedor') then
      raise exception 'O lojista só cria gerente ou vendedor.';
    end if;
    v_org := v_caller_org;
  elsif p_papel = 'admin_master' then
    v_org := null;
  elsif p_papel = 'proprietario' and p_organizacao is null then
    if coalesce(trim(p_nome_loja), '') = '' then
      raise exception 'Informe o nome da loja.';
    end if;
    insert into public.organizacoes (nome) values (trim(p_nome_loja)) returning id into v_org;
  else
    if p_organizacao is null then raise exception 'Selecione a loja.'; end if;
    v_org := p_organizacao;
  end if;

  v_id := gen_random_uuid();
  select coalesce((select ai.id from auth.instances ai limit 1), '00000000-0000-0000-0000-000000000000'::uuid)
    into v_instancia;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values (v_instancia, v_id, 'authenticated', 'authenticated', lower(p_email),
    crypt(p_senha, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', p_nome),
    now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
  values (gen_random_uuid(), v_id,
    jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true),
    'email', v_id::text, now(), now(), now());

  insert into public.perfis (id, organizacao_id, nome, papel, ativo)
  values (v_id, v_org, p_nome, p_papel, true);

  return v_id;
end $$;

create or replace function public.admin_atualizar_usuario(p_id uuid, p_nome text, p_papel text)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller text; v_caller_org uuid; v_alvo_org uuid; v_alvo_papel text;
begin
  select pf.papel, pf.organizacao_id into v_caller, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_caller is null or v_caller not in ('admin_master','proprietario') then
    raise exception 'Sem permissão.';
  end if;
  select pf.organizacao_id, pf.papel into v_alvo_org, v_alvo_papel from public.perfis pf where pf.id = p_id;
  if v_alvo_papel is null then raise exception 'Usuário não encontrado.'; end if;
  if v_caller = 'proprietario' and not (v_alvo_org = v_caller_org and v_alvo_papel in ('gerente','vendedor')) then
    raise exception 'Sem permissão para este usuário.';
  end if;
  if p_papel is not null then
    if p_papel not in ('admin_master','proprietario','gerente','vendedor') then raise exception 'Papel inválido.'; end if;
    if v_caller = 'proprietario' and p_papel not in ('gerente','vendedor') then
      raise exception 'O lojista só define gerente ou vendedor.';
    end if;
    update public.perfis set papel = p_papel where id = p_id;
  end if;
  if p_nome is not null then update public.perfis set nome = p_nome where id = p_id; end if;
end $$;

create or replace function public.admin_definir_suspenso(p_id uuid, p_suspenso boolean)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_caller text; v_caller_org uuid; v_alvo_org uuid; v_alvo_papel text;
begin
  if p_id = auth.uid() then raise exception 'Você não pode suspender a própria conta.'; end if;
  select pf.papel, pf.organizacao_id into v_caller, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_caller is null or v_caller not in ('admin_master','proprietario') then
    raise exception 'Sem permissão.';
  end if;
  select pf.organizacao_id, pf.papel into v_alvo_org, v_alvo_papel from public.perfis pf where pf.id = p_id;
  if v_alvo_papel is null then raise exception 'Usuário não encontrado.'; end if;
  if v_caller = 'proprietario' and not (v_alvo_org = v_caller_org and v_alvo_papel in ('gerente','vendedor')) then
    raise exception 'Sem permissão para este usuário.';
  end if;
  update public.perfis set ativo = not p_suspenso where id = p_id;
  update auth.users set banned_until = case when p_suspenso then now() + interval '100 years' else null end
    where id = p_id;
end $$;

create or replace function public.admin_excluir_usuario(p_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_caller text; v_caller_org uuid; v_alvo_org uuid; v_alvo_papel text;
begin
  if p_id = auth.uid() then raise exception 'Você não pode excluir a própria conta.'; end if;
  select pf.papel, pf.organizacao_id into v_caller, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_caller is null or v_caller not in ('admin_master','proprietario') then
    raise exception 'Sem permissão.';
  end if;
  select pf.organizacao_id, pf.papel into v_alvo_org, v_alvo_papel from public.perfis pf where pf.id = p_id;
  if v_alvo_papel is null then raise exception 'Usuário não encontrado.'; end if;
  if v_caller = 'proprietario' and not (v_alvo_org = v_caller_org and v_alvo_papel in ('gerente','vendedor')) then
    raise exception 'Sem permissão para este usuário.';
  end if;
  delete from auth.users where id = p_id;
end $$;

revoke execute on function public.admin_listar_usuarios(),
  public.admin_criar_usuario(text,text,text,text,uuid,text),
  public.admin_atualizar_usuario(uuid,text,text),
  public.admin_definir_suspenso(uuid,boolean),
  public.admin_excluir_usuario(uuid) from public, anon;
grant execute on function public.admin_listar_usuarios(),
  public.admin_criar_usuario(text,text,text,text,uuid,text),
  public.admin_atualizar_usuario(uuid,text,text),
  public.admin_definir_suspenso(uuid,boolean),
  public.admin_excluir_usuario(uuid) to authenticated;

commit;

-- Verificação: deve listar as policies novas (veiculos_insert_proprietario, veiculos_select_gestao, etc.)
select tablename, policyname from pg_policies where schemaname = 'public' and tablename = 'veiculos' order by 2;
