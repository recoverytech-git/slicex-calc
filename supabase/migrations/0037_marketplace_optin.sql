-- 0037: marketplace geral. Cada loja decide se aparece (opt-in). Padrao: nao aparece.
alter table public.organizacoes add column if not exists marketplace_ativo boolean not null default false;
notify pgrst, 'reload schema';
