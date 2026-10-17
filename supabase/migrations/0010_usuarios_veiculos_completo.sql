-- 0010 — CPF e telefone de usuários, dados da loja, edição de usuários e exclusão de veículo.
-- Executar DEPOIS da 0009. Tudo em uma transação.

begin;

alter table public.perfis add column if not exists cpf text;
alter table public.perfis add column if not exists telefone text;
alter table public.organizacoes add column if not exists cnpj text;
alter table public.organizacoes add column if not exists telefone_comercial text;
alter table public.organizacoes add column if not exists endereco text;

drop function if exists public.admin_listar_usuarios();
drop function if exists public.admin_criar_usuario(text, text, text, text, uuid, text);
drop function if exists public.admin_atualizar_usuario(uuid, text, text);

create or replace function public.admin_listar_usuarios()
returns table (id uuid, nome text, email text, papel text, ativo boolean, cpf text, telefone text,
  organizacao_id uuid, organizacao_nome text, cnpj text, telefone_comercial text, endereco text)
language plpgsql stable security definer set search_path = public, auth as $$
declare v_papel text; v_org uuid;
begin
  select pf.papel, pf.organizacao_id into v_papel, v_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_papel is null or v_papel not in ('admin_master','proprietario') then
    raise exception 'Sem permissão.';
  end if;
  return query
    select pf.id, pf.nome, u.email::text, pf.papel, pf.ativo, pf.cpf, pf.telefone,
           pf.organizacao_id, og.nome, og.cnpj, og.telefone_comercial, og.endereco
    from public.perfis pf
    join auth.users u on u.id = pf.id
    left join public.organizacoes og on og.id = pf.organizacao_id
    where v_papel = 'admin_master'
       or (pf.organizacao_id = v_org and pf.papel <> 'admin_master')
    order by pf.nome;
end $$;

create or replace function public.admin_criar_usuario(
  p_email text, p_senha text, p_nome text, p_papel text,
  p_organizacao uuid default null, p_nome_loja text default null,
  p_cpf text default null, p_telefone text default null,
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
  if p_cpf is not null and length(regexp_replace(p_cpf,'\D','','g')) not in (0,11) then raise exception 'CPF inválido.'; end if;
  if p_cnpj is not null and length(regexp_replace(p_cnpj,'\D','','g')) not in (0,14) then raise exception 'CNPJ inválido.'; end if;
  if exists (select 1 from auth.users where email = lower(p_email)) then raise exception 'Já existe um usuário com este e-mail.'; end if;

  if v_caller_papel = 'proprietario' then
    if p_papel not in ('gerente','vendedor') then raise exception 'O lojista só cria gerente ou vendedor.'; end if;
    v_org := v_caller_org;
  elsif p_papel = 'admin_master' then
    v_org := null;
  elsif p_papel = 'proprietario' and p_organizacao is null then
    if coalesce(trim(p_nome_loja), '') = '' then raise exception 'Informe o nome da loja.'; end if;
    insert into public.organizacoes (nome, cnpj, telefone_comercial, endereco)
    values (trim(p_nome_loja),
      nullif(regexp_replace(coalesce(p_cnpj,''),'\D','','g'),''),
      nullif(regexp_replace(coalesce(p_telefone_comercial,''),'\D','','g'),''),
      nullif(trim(coalesce(p_endereco,'')),''))
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
    jsonb_build_object('nome', p_nome),
    now(), now(), '', '', '', '');

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

create or replace function public.admin_atualizar_usuario(
  p_id uuid, p_nome text default null, p_papel text default null, p_email text default null,
  p_cpf text default null, p_telefone text default null, p_nome_loja text default null,
  p_cnpj text default null, p_telefone_comercial text default null, p_endereco text default null)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_caller text; v_caller_org uuid; v_alvo_org uuid; v_alvo_papel text; v_email text := lower(trim(p_email));
begin
  select pf.papel, pf.organizacao_id into v_caller, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_caller is null or v_caller not in ('admin_master','proprietario') then raise exception 'Sem permissão.'; end if;
  if p_id = auth.uid() and p_papel is not null and p_papel is distinct from (select pf.papel from public.perfis pf where pf.id = p_id) then
    raise exception 'Você não pode alterar o próprio papel.';
  end if;
  select pf.organizacao_id, pf.papel into v_alvo_org, v_alvo_papel from public.perfis pf where pf.id = p_id;
  if v_alvo_papel is null then raise exception 'Usuário não encontrado.'; end if;
  if v_caller = 'proprietario' and not (v_alvo_org = v_caller_org and v_alvo_papel in ('gerente','vendedor')) then
    raise exception 'Sem permissão para este usuário.';
  end if;
  if p_cpf is not null and length(regexp_replace(p_cpf,'\D','','g')) not in (0,11) then raise exception 'CPF inválido.'; end if;

  if p_papel is not null then
    if p_papel not in ('admin_master','proprietario','gerente','vendedor') then raise exception 'Papel inválido.'; end if;
    if v_caller = 'proprietario' and p_papel not in ('gerente','vendedor') then
      raise exception 'O lojista só define gerente ou vendedor.';
    end if;
    update public.perfis set papel = p_papel where id = p_id;
  end if;

  update public.perfis set
    nome = coalesce(nullif(trim(p_nome),''), nome),
    cpf = case when p_cpf is null then cpf else nullif(regexp_replace(p_cpf,'\D','','g'),'') end,
    telefone = case when p_telefone is null then telefone else nullif(regexp_replace(p_telefone,'\D','','g'),'') end
  where id = p_id;

  if v_email <> '' and v_email <> (select u.email from auth.users u where u.id = p_id) then
    if exists (select 1 from auth.users u where u.email = v_email and u.id <> p_id) then
      raise exception 'Este e-mail já está em uso.';
    end if;
    update auth.users set email = v_email where id = p_id;
    update auth.identities set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_email))
      where user_id = p_id and provider = 'email';
  end if;

  if p_nome_loja is not null or p_cnpj is not null or p_telefone_comercial is not null or p_endereco is not null then
    if v_caller <> 'admin_master' or v_alvo_org is null then
      raise exception 'Somente o administrador edita os dados da loja.';
    end if;
    update public.organizacoes set
      nome = coalesce(nullif(trim(p_nome_loja),''), nome),
      cnpj = case when p_cnpj is null then cnpj else nullif(regexp_replace(p_cnpj,'\D','','g'),'') end,
      telefone_comercial = case when p_telefone_comercial is null then telefone_comercial
                                else nullif(regexp_replace(p_telefone_comercial,'\D','','g'),'') end,
      endereco = case when p_endereco is null then endereco else nullif(trim(p_endereco),'') end
    where id = v_alvo_org;
  end if;
end $$;

create or replace function public.excluir_veiculo(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller text; v_caller_org uuid; v_org uuid;
begin
  select pf.papel, pf.organizacao_id into v_caller, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  select v.organizacao_id into v_org from public.veiculos v where v.id = p_id;
  if v_org is null then raise exception 'Veículo não encontrado.'; end if;
  if not (v_caller = 'admin_master' or (v_caller = 'proprietario' and v_org = v_caller_org)) then
    raise exception 'Sem permissão.';
  end if;
  delete from public.veiculo_financiamento_parcelas
    where financiamento_id in (select f.id from public.veiculo_financiamentos f where f.veiculo_id = p_id);
  delete from public.veiculo_financiamentos where veiculo_id = p_id;
  delete from public.veiculo_custos where veiculo_id = p_id;
  delete from public.veiculo_dados_financeiros where veiculo_id = p_id;
  delete from public.veiculo_checklists where veiculo_id = p_id;
  delete from public.veiculo_fotos where veiculo_id = p_id;
  delete from public.veiculo_vendas where veiculo_id = p_id;
  delete from public.veiculo_historico where veiculo_id = p_id;
  delete from public.veiculos where id = p_id;
end $$;

revoke execute on function public.admin_listar_usuarios(),
  public.admin_criar_usuario(text,text,text,text,uuid,text,text,text,text,text,text),
  public.admin_atualizar_usuario(uuid,text,text,text,text,text,text,text,text,text),
  public.excluir_veiculo(uuid) from public, anon;
grant execute on function public.admin_listar_usuarios(),
  public.admin_criar_usuario(text,text,text,text,uuid,text,text,text,text,text,text),
  public.admin_atualizar_usuario(uuid,text,text,text,text,text,text,text,text,text),
  public.excluir_veiculo(uuid) to authenticated;

create or replace function public.admin_atualizar_organizacao(
  p_org uuid, p_nome text default null, p_cnpj text default null,
  p_telefone text default null, p_endereco text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.perfis pf where pf.id = auth.uid() and pf.papel = 'admin_master' and pf.ativo) then
    raise exception 'Somente o administrador edita os dados da loja.';
  end if;
  if p_cnpj is not null and length(regexp_replace(p_cnpj,'\D','','g')) not in (0,14) then
    raise exception 'CNPJ inválido.';
  end if;
  update public.organizacoes set
    nome = coalesce(nullif(trim(p_nome),''), nome),
    cnpj = case when p_cnpj is null then cnpj else nullif(regexp_replace(p_cnpj,'\D','','g'),'') end,
    telefone_comercial = case when p_telefone is null then telefone_comercial else nullif(regexp_replace(p_telefone,'\D','','g'),'') end,
    endereco = case when p_endereco is null then endereco else nullif(trim(p_endereco),'') end
  where id = p_org;
end $$;

revoke execute on function public.admin_atualizar_organizacao(uuid,text,text,text,text) from public, anon;
grant execute on function public.admin_atualizar_organizacao(uuid,text,text,text,text) to authenticated;

commit;
