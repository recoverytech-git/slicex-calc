-- 0008 — Dados de gestão de usuários. Executar DEPOIS da 0007.
-- Criar, suspender, reativar e excluir usuários acontecem na Edge Function
-- gerenciar-usuarios (Admin API). Aqui ficam só leitura da lista e troca de papel.

begin;

-- Remove as versões que escreviam direto em auth.* (substituídas pela Edge Function)
drop function if exists public.admin_criar_usuario(text, text, text, text, uuid, text);
drop function if exists public.admin_definir_suspenso(uuid, boolean);
drop function if exists public.admin_excluir_usuario(uuid);

-- Lista de usuários visíveis para quem gerencia (admin: todos; lojista: a própria loja)
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

-- Troca de papel, com as mesmas regras de quem pode alterar quem
create or replace function public.admin_atualizar_usuario(p_id uuid, p_nome text, p_papel text)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller text; v_caller_org uuid; v_alvo_org uuid; v_alvo_papel text;
begin
  select pf.papel, pf.organizacao_id into v_caller, v_caller_org
    from public.perfis pf where pf.id = auth.uid() and pf.ativo;
  if v_caller is null or v_caller not in ('admin_master','proprietario') then
    raise exception 'Sem permissão.';
  end if;
  if p_id = auth.uid() then raise exception 'Você não pode alterar o próprio papel.'; end if;
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

revoke execute on function public.admin_listar_usuarios(), public.admin_atualizar_usuario(uuid,text,text) from public, anon;
grant execute on function public.admin_listar_usuarios(), public.admin_atualizar_usuario(uuid,text,text) to authenticated;

commit;
