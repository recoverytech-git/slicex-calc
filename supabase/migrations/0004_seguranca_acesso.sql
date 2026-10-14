-- 0004 — Endurecimento de segurança e acesso pela Data API. Idempotente.
-- Motivo: as tabelas aparecem como "API DISABLED" e a view v_veiculos_financeiros_gestao
-- pode ignorar o RLS do usuário se não usar security_invoker.

-- 1. Usuários logados podem usar a Data API; o RLS continua filtrando as linhas.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- 2. Visitante anônimo não lê nem escreve nada.
revoke all on all tables in schema public from anon;

-- 3. Funções de autorização: só usuários logados podem chamá-las.
revoke execute on function public.minha_organizacao(), public.meu_papel() from public, anon;
grant execute on function public.minha_organizacao(), public.meu_papel() to authenticated;

-- 4. A view passa a respeitar o RLS de quem consulta.
do $$
begin
  if to_regclass('public.v_veiculos_financeiros_gestao') is not null then
    alter view public.v_veiculos_financeiros_gestao set (security_invoker = true);
  end if;
end $$;

-- 5. RLS ligado em toda tabela pública.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;
