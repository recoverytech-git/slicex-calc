-- 0012 — Logs de auditoria de toda a plataforma, configurações da marca e bucket da marca.
-- Executar DEPOIS da 0011. Tudo em uma transação.

begin;

-- 1. Logs: registram INSERT, UPDATE e DELETE das tabelas do sistema
create table if not exists public.logs_sistema (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  usuario_id uuid,
  usuario_nome text,
  papel text,
  organizacao_id uuid,
  tabela text not null,
  operacao text not null check (operacao in ('INSERT','UPDATE','DELETE')),
  registro_id text,
  antes jsonb,
  depois jsonb
);
create index if not exists logs_sistema_criado_idx on public.logs_sistema (criado_em desc);
create index if not exists logs_sistema_tabela_idx on public.logs_sistema (tabela, criado_em desc);
create index if not exists logs_sistema_usuario_idx on public.logs_sistema (usuario_id, criado_em desc);

alter table public.logs_sistema enable row level security;
drop policy if exists logs_select_admin on public.logs_sistema;
create policy logs_select_admin on public.logs_sistema for select to authenticated
  using (public.meu_papel() = 'admin_master');
revoke all on public.logs_sistema from anon, authenticated;
grant select on public.logs_sistema to authenticated;

create or replace function public.registrar_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_papel text; v_org uuid; v_reg text;
begin
  select pf.nome, pf.papel, pf.organizacao_id into v_nome, v_papel, v_org
    from public.perfis pf where pf.id = auth.uid();
  v_reg := coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', '');
  insert into public.logs_sistema (usuario_id, usuario_nome, papel, organizacao_id, tabela, operacao, registro_id, antes, depois)
  values (auth.uid(), v_nome, v_papel, v_org, tg_table_name, tg_op, v_reg,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

-- 2. Configurações da marca (logomarcas e favicon)
create table if not exists public.configuracoes (
  chave text primary key,
  valor text,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);
alter table public.configuracoes enable row level security;
drop policy if exists config_select_publico on public.configuracoes;
create policy config_select_publico on public.configuracoes for select to anon, authenticated using (true);
drop policy if exists config_escrita_admin on public.configuracoes;
create policy config_escrita_admin on public.configuracoes for all to authenticated
  using (public.meu_papel() = 'admin_master') with check (public.meu_papel() = 'admin_master');
grant select on public.configuracoes to anon, authenticated;
insert into public.configuracoes (chave) values ('logo_sidebar'), ('logo_header'), ('favicon')
  on conflict (chave) do nothing;

-- 3. Bucket público da marca: leitura livre (logos), escrita só do administrador
insert into storage.buckets (id, name, public) values ('marca', 'marca', true)
  on conflict (id) do nothing;
drop policy if exists marca_admin_escrita on storage.objects;
create policy marca_admin_escrita on storage.objects for all to authenticated
  using (bucket_id = 'marca' and public.meu_papel() = 'admin_master')
  with check (bucket_id = 'marca' and public.meu_papel() = 'admin_master');

-- 4. Auditoria ligada nas tabelas do sistema
do $$
declare t text;
begin
  foreach t in array array['veiculos','veiculo_custos','veiculo_dados_financeiros','veiculo_financiamentos',
    'veiculo_financiamento_parcelas','veiculo_fotos','veiculo_checklists','veiculo_vendas',
    'organizacoes','perfis','configuracoes']
  loop
    execute format('drop trigger if exists trg_log_%1$s on public.%1$s', t);
    execute format('create trigger trg_log_%1$s after insert or update or delete on public.%1$s for each row execute function public.registrar_log()', t);
  end loop;
end $$;

revoke execute on function public.registrar_log() from public, anon, authenticated;

commit;
