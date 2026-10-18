-- 0017 — Link de preenchimento da ficha pelo cliente e notificações da loja.
-- Executar DEPOIS da 0016. Tudo em uma transação.

begin;

-- 1. Links de ficha (token aleatório, validade, uso único)
create table if not exists public.fichas_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  criado_por uuid references auth.users(id) on delete set null,
  status text not null default 'aberto' check (status in ('aberto','preenchido')),
  expira_em timestamptz not null,
  criado_em timestamptz not null default now(),
  usado_em timestamptz,
  lead_id uuid references public.leads(id) on delete set null
);
create index if not exists fichas_links_org_idx on public.fichas_links (organizacao_id, criado_em desc);
alter table public.fichas_links enable row level security;

drop policy if exists fichas_links_select on public.fichas_links;
create policy fichas_links_select on public.fichas_links for select to authenticated using (
  public.meu_papel() = 'admin_master'
  or (organizacao_id = public.minha_organizacao() and public.meu_papel() in ('proprietario','gerente','vendedor')));

revoke all on public.fichas_links from anon, authenticated;
grant select on public.fichas_links to authenticated;

-- 2. Notificações por usuário
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  mensagem text,
  link_ref uuid,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists notificacoes_usuario_idx on public.notificacoes (usuario_id, criado_em desc);
alter table public.notificacoes enable row level security;

drop policy if exists notificacoes_select on public.notificacoes;
create policy notificacoes_select on public.notificacoes for select to authenticated using (usuario_id = auth.uid());

drop policy if exists notificacoes_update on public.notificacoes;
create policy notificacoes_update on public.notificacoes for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

revoke all on public.notificacoes from anon, authenticated;
grant select on public.notificacoes to authenticated;
grant update (lida) on public.notificacoes to authenticated;

-- 3. Gerar link (lojista, gerente ou vendedor da loja)
create or replace function public.gerar_link_ficha(p_dias int default 7)
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid(); v_papel text; v_org uuid; v_token text;
begin
  select pf.papel, pf.organizacao_id into v_papel, v_org
    from public.perfis pf where pf.id = v_uid and pf.ativo;
  if v_papel is null or v_papel not in ('admin_master','proprietario','gerente','vendedor') then
    raise exception 'Sem permissão para gerar link.';
  end if;
  if v_org is null then raise exception 'Sua conta não está vinculada a uma loja.'; end if;
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.fichas_links (token, organizacao_id, criado_por, expira_em)
  values (v_token, v_org, v_uid, now() + make_interval(days => greatest(1, least(p_dias, 30))));
  return v_token;
end $$;

-- 4. Consultar o link (público, só devolve o mínimo para a tela do cliente)
create or replace function public.obter_link_ficha(p_token text)
returns table (org_nome text, status text, expira_em timestamptz)
language sql stable security definer set search_path = public as $$
  select og.nome, fl.status, fl.expira_em
  from public.fichas_links fl
  join public.organizacoes og on og.id = fl.organizacao_id
  where fl.token = p_token
$$;

-- 5. Cliente salva bloco 1 e bloco 2 (público, uma vez por link)
create or replace function public.salvar_ficha_cliente(p_token text, p_dados jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_link public.fichas_links%rowtype;
  v_lead uuid; v_nome text; v_cpf text; v_tel text; v_filtrado jsonb;
  v_chaves text[] := array['nome','mae','rg','cpf','nascimento','telefone','estado_civil','email','cep',
    'endereco','numero','complemento','bairro','cidade','uf','tempo_residencia','cnh',
    'empresa','admissao','profissao','cargo','renda','renda_adicional','contato_empresa'];
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

-- 6. Permissões das funções
revoke execute on function public.gerar_link_ficha(int), public.obter_link_ficha(text), public.salvar_ficha_cliente(text, jsonb) from public;
grant execute on function public.gerar_link_ficha(int) to authenticated;
grant execute on function public.obter_link_ficha(text), public.salvar_ficha_cliente(text, jsonb) to anon, authenticated;

commit;
