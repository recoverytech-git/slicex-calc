-- 0005 — Remove privilégios perigosos e mantém só o necessário. Idempotente.
-- TRUNCATE, TRIGGER e REFERENCES não são filtrados pelo RLS: removê-los de anon e authenticated.

revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;

-- Estoque nunca é apagado pelo cliente (histórico preservado)
revoke delete on public.veiculos from authenticated;

-- A visão financeira é só para leitura de quem está logado
revoke all on public.v_veiculos_financeiros_gestao from anon;

-- Mínimo para o app funcionar (RLS continua filtrando as linhas)
grant select, insert, update on public.organizacoes, public.perfis, public.veiculos to authenticated;
