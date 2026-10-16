-- 0010 — Dados cadastrais de usuários e lojas, edição e exclusão de veículo. Executar após a 0009.
begin;

-- 1. Campos novos (CPF e telefone de pessoas; CNPJ, telefone e endereço de lojas)
alter table public.perfis add column if not exists cpf text;
alter table public.perfis add column if not exists telefone text;
alter table public.organizacoes add column if not exists cnpj text;
alter table public.organizacoes add column if not exists telefone text;
alter table public.organizacoes add column if not exists endereco text;

-- 2. Listagem de usuários com os novos campos
drop function if exists public.admin_listar_usuarios();
create function public.admin_listar_usuarios()
returns table (id uuid, nome text, email text, papel text, ativo boolean, cpf text, telefone text,
  organizacao_id uuid, organizacao_nome text, organizacao_cnpj text, organizacao_telefone text, organizacao_endereco text)
language plpgsql stable security definer set search_path = public, auth as $$
declare v_papel text; v_org uuid;
begin
  select pf.papel, pf.organizacao_id into v_papel, v_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_papel is null or v_papel not in ('admin_master','proprietario') then raise exception 'Sem permissão.'; end if;
  return query
    select pf.id, pf.nome, u.email::text, pf.papel, pf.ativo, pf.cpf, pf.telefone,
           pf.organizacao_id, og.nome, og.cnpj, og.telefone, og.endereco
    from public.perfis pf
    join auth.users u on u.id = pf.id
    left join public.organizacoes og on og.id = pf.organizacao_id
    where v_papel = 'admin_master' or (pf.organizacao_id = v_org and pf.papel <> 'admin_master')
    order by pf.nome;
end $$;

-- 3. Criação de usuário com dados cadastrais (lojista também cria a loja)
drop function if exists public.admin_criar_usuario(text,text,text,text,uuid,text);
create function public.admin_criar_usuario(
  p_email text, p_senha text, p_nome text, p_papel text,
  p_cpf text default null, p_telefone text default null,
  p_organizacao uuid default null, p_nome_loja text default null,
  p_cnpj text default null, p_telefone_comercial text default null, p_endereco text default null)
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
  if p_email is null or p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'E-mail inválido.'; end if;
  if p_senha is null or length(p_senha) < 8 then raise exception 'A senha deve ter pelo menos 8 caracteres.'; end if;
  if p_papel not in ('admin_master','proprietario','gerente','vendedor') then raise exception 'Papel inválido.'; end if;
  if p_cpf is not null and length(regexp_replace(p_cpf,'\D','','g')) <> 11 then raise exception 'CPF inválido.'; end if;
  if p_telefone is not null and length(regexp_replace(p_telefone,'\D','','g')) not in (10,11) then raise exception 'Telefone inválido.'; end if;
  if p_cnpj is not null and length(regexp_replace(p_cnpj,'\D','','g')) <> 14 then raise exception 'CNPJ inválido.'; end if;
  if exists (select 1 from auth.users where email = lower(p_email)) then
    raise exception 'Já existe um usuário com este e-mail.';
  end if;

  if v_caller_papel = 'proprietario' then
    if p_papel not in ('gerente','vendedor') then raise exception 'O lojista só cria gerente ou vendedor.'; end if;
    v_org := v_caller_org;
  elsif p_papel = 'admin_master' then
    v_org := null;
  elsif p_papel = 'proprietario' and p_organizacao is null then
    if coalesce(trim(p_nome_loja), '') = '' then raise exception 'Informe o nome da loja.'; end if;
    insert into public.organizacoes (nome, cnpj, telefone, endereco)
    values (trim(p_nome_loja), p_cnpj, p_telefone_comercial, p_endereco)
    returning id into v_org;
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
    jsonb_build_object('nome', p_nome), now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
  values (gen_random_uuid(), v_id,
    jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true),
    'email', v_id::text, now(), now(), now());

  insert into public.perfis (id, organizacao_id, nome, papel, ativo, cpf, telefone)
  values (v_id, v_org, p_nome, p_papel, true,
    nullif(regexp_replace(coalesce(p_cpf,''),'\D','','g'),''),
    nullif(regexp_replace(coalesce(p_telefone,''),'\D','','g'),''));

  return v_id;
end $$;

-- 4. Edição de usuário (nome, CPF, telefone, papel)
drop function if exists public.admin_atualizar_usuario(uuid,text,text);
create function public.admin_atualizar_usuario(p_id uuid, p_nome text, p_papel text, p_cpf text, p_telefone text)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller text; v_caller_org uuid; v_alvo_org uuid; v_alvo_papel text;
begin
  select pf.papel, pf.organizacao_id into v_caller, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_caller is null or v_caller not in ('admin_master','proprietario') then raise exception 'Sem permissão.'; end if;
  if p_id = auth.uid() and p_papel is not null then raise exception 'Você não pode alterar o próprio papel.'; end if;
  select pf.organizacao_id, pf.papel into v_alvo_org, v_alvo_papel from public.perfis pf where pf.id = p_id;
  if v_alvo_papel is null then raise exception 'Usuário não encontrado.'; end if;
  if v_caller = 'proprietario' and not (v_alvo_org = v_caller_org and v_alvo_papel in ('gerente','vendedor')) then
    raise exception 'Sem permissão para este usuário.';
  end if;
  if p_cpf is not null and p_cpf <> '' and length(regexp_replace(p_cpf,'\D','','g')) <> 11 then raise exception 'CPF inválido.'; end if;
  if p_telefone is not null and p_telefone <> '' and length(regexp_replace(p_telefone,'\D','','g')) not in (10,11) then
    raise exception 'Telefone inválido.';
  end if;
  if p_papel is not null then
    if p_papel not in ('admin_master','proprietario','gerente','vendedor') then raise exception 'Papel inválido.'; end if;
    if v_caller = 'proprietario' and p_papel not in ('gerente','vendedor') then
      raise exception 'O lojista só define gerente ou vendedor.';
    end if;
  end if;
  update public.perfis set
    nome = coalesce(p_nome, nome),
    papel = coalesce(p_papel, papel),
    cpf = case when p_cpf is null then cpf when p_cpf = '' then null else regexp_replace(p_cpf,'\D','','g') end,
    telefone = case when p_telefone is null then telefone when p_telefone = '' then null else regexp_replace(p_telefone,'\D','','g') end
  where id = p_id;
end $$;

-- 5. Edição de dados da loja (admin, ou lojista da própria loja)
create or replace function public.admin_atualizar_organizacao(p_org uuid, p_nome text, p_cnpj text, p_telefone text, p_endereco text)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller text; v_caller_org uuid;
begin
  select pf.papel, pf.organizacao_id into v_caller, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if not (v_caller = 'admin_master' or (v_caller = 'proprietario' and v_caller_org = p_org)) then
    raise exception 'Sem permissão para esta loja.';
  end if;
  if p_cnpj is not null and p_cnpj <> '' and length(regexp_replace(p_cnpj,'\D','','g')) <> 14 then raise exception 'CNPJ inválido.'; end if;
  update public.organizacoes set
    nome = coalesce(nullif(trim(p_nome),''), nome),
    cnpj = case when p_cnpj is null then cnpj when p_cnpj = '' then null else regexp_replace(p_cnpj,'\D','','g') end,
    telefone = case when p_telefone is null then telefone when p_telefone = '' then null else regexp_replace(p_telefone,'\D','','g') end,
    endereco = coalesce(p_endereco, endereco)
  where id = p_org;
end $$;

-- 6. Exclusão de veículo (admin: qualquer; lojista: da própria loja).
--    Fotos no Storage são removidas pelo cliente antes desta chamada.
create or replace function public.excluir_veiculo(p_veiculo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller text; v_caller_org uuid; v_org uuid;
begin
  select pf.papel, pf.organizacao_id into v_caller, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  select v.organizacao_id into v_org from public.veiculos v where v.id = p_veiculo;
  if v_org is null then raise exception 'Veículo não encontrado.'; end if;
  if not (v_caller = 'admin_master' or (v_caller = 'proprietario' and v_org = v_caller_org)) then
    raise exception 'Sem permissão para excluir este veículo.';
  end if;
  delete from public.veiculo_fotos where veiculo_id = p_veiculo;
  delete from public.veiculo_financiamento_parcelas
    where financiamento_id in (select f.id from public.veiculo_financiamentos f where f.veiculo_id = p_veiculo);
  delete from public.veiculo_financiamentos where veiculo_id = p_veiculo;
  delete from public.veiculo_custos where veiculo_id = p_veiculo;
  delete from public.veiculo_checklists where veiculo_id = p_veiculo;
  delete from public.veiculo_vendas where veiculo_id = p_veiculo;
  delete from public.veiculo_historico where veiculo_id = p_veiculo;
  delete from public.veiculo_dados_financeiros where veiculo_id = p_veiculo;
  delete from public.veiculos where id = p_veiculo;
end $$;

-- 7. Permissões das funções novas
revoke execute on function public.admin_listar_usuarios(),
  public.admin_criar_usuario(text,text,text,text,text,text,uuid,text,text,text,text),
  public.admin_atualizar_usuario(uuid,text,text,text,text),
  public.admin_atualizar_organizacao(uuid,text,text,text,text),
  public.excluir_veiculo(uuid) from public, anon;
grant execute on function public.admin_listar_usuarios(),
  public.admin_criar_usuario(text,text,text,text,text,text,uuid,text,text,text,text),
  public.admin_atualizar_usuario(uuid,text,text,text,text),
  public.admin_atualizar_organizacao(uuid,text,text,text,text),
  public.excluir_veiculo(uuid) to authenticated;

commit;
