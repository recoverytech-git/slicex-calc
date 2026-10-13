-- Reverte 0001_fundacao.sql. Só executar se não houver dados de produção a preservar.
drop policy if exists "perfil_select_admin" on public.perfis;
drop policy if exists "perfil_select_proprio" on public.perfis;
drop policy if exists "org_select_propria" on public.organizacoes;
drop function if exists public.meu_papel();
drop function if exists public.minha_organizacao();
drop table if exists public.perfis;
drop table if exists public.organizacoes;
