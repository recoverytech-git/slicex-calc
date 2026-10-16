-- 0009 — Criação, suspensão e exclusão de usuários pelo banco (sem Edge Function).
-- Executar DEPOIS da 0008. Quem chama precisa ser admin_master ou proprietario.
-- Regras: admin faz tudo; lojista só age sobre gerente e vendedor da própria loja.

begin;

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

create or replace function public.admin_definir_suspenso(p_id uuid, p_suspenso boolean)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_caller text; v_caller_org uuid; v_alvo_org uuid; v_alvo_papel text;
begin
  if p_id = auth.uid() then raise exception 'Você não pode suspender a própria conta.'; end if;
  select pf.papel, pf.organizacao_id into v_caller, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_caller is null or v_caller not in ('admin_master','proprietario') then raise exception 'Sem permissão.'; end if;
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
  if v_caller is null or v_caller not in ('admin_master','proprietario') then raise exception 'Sem permissão.'; end if;
  select pf.organizacao_id, pf.papel into v_alvo_org, v_alvo_papel from public.perfis pf where pf.id = p_id;
  if v_alvo_papel is null then raise exception 'Usuário não encontrado.'; end if;
  if v_caller = 'proprietario' and not (v_alvo_org = v_caller_org and v_alvo_papel in ('gerente','vendedor')) then
    raise exception 'Sem permissão para este usuário.';
  end if;
  delete from auth.users where id = p_id;
end $$;

revoke execute on function public.admin_criar_usuario(text,text,text,text,uuid,text),
  public.admin_definir_suspenso(uuid,boolean), public.admin_excluir_usuario(uuid) from public, anon;
grant execute on function public.admin_criar_usuario(text,text,text,text,uuid,text),
  public.admin_definir_suspenso(uuid,boolean), public.admin_excluir_usuario(uuid) to authenticated;

commit;
