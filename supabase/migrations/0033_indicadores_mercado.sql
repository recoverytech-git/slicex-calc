-- 0033: indicadores de mercado (CDI) atualizados automaticamente pela funcao /api/atualizar-cdi
create table if not exists public.indicadores_mercado (
  chave text primary key,
  valor numeric not null,
  referencia date,
  fonte text,
  atualizado_em timestamptz not null default now()
);

alter table public.indicadores_mercado enable row level security;
drop policy if exists indicadores_select on public.indicadores_mercado;
create policy indicadores_select on public.indicadores_mercado for select to authenticated using (true);
revoke all on public.indicadores_mercado from anon;
grant select on public.indicadores_mercado to authenticated;

notify pgrst, 'reload schema';
