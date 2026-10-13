-- Fase 2 — Fundação. Aplicar no SQL Editor do Supabase (projeto slicex-calc).
-- Esquema verificado vazio antes desta migração (schema public sem tabelas).
-- Reversível: ver 0001_fundacao.down.sql.

create extension if not exists "pgcrypto";

-- Organizações (preparado para múltiplas lojas; V1 usa uma)
create table if not exists public.organizacoes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  ativa       boolean not null default true,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Perfis vinculados ao Supabase Auth (senha NUNCA fica aqui)
create table if not exists public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  organizacao_id uuid references public.organizacoes(id) on delete restrict,
  nome        text,
  papel       text not null default 'vendedor'
              check (papel in ('admin_master','proprietario','gerente','vendedor')),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Função auxiliar: organização do usuário autenticado (fonte confiável = tabela, não metadados)
create or replace function public.minha_organizacao()
returns uuid language sql stable security definer set search_path = public as $$
  select organizacao_id from public.perfis where id = auth.uid() and ativo
$$;

-- Função auxiliar: papel do usuário autenticado
create or replace function public.meu_papel()
returns text language sql stable security definer set search_path = public as $$
  select papel from public.perfis where id = auth.uid() and ativo
$$;

-- RLS habilitado desde o início
alter table public.organizacoes enable row level security;
alter table public.perfis       enable row level security;

-- Organizações: o usuário vê apenas a própria organização
create policy "org_select_propria" on public.organizacoes
  for select to authenticated using (id = public.minha_organizacao());

-- Perfis: cada usuário vê o próprio perfil; admin_master vê todos (ajustável)
create policy "perfil_select_proprio" on public.perfis
  for select to authenticated using (id = auth.uid());

create policy "perfil_select_admin" on public.perfis
  for select to authenticated using (public.meu_papel() = 'admin_master');

-- Nenhum usuário altera o próprio papel (evita escalonamento de privilégio)
-- Escrita em perfis fica restrita ao backend/admin via service_role, não ao cliente.
