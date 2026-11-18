-- 0039: custos recorrentes do estoque e meta de lucro liquido mensal (isolados por loja)
create table if not exists public.custos_recorrentes (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  descricao text not null,
  categoria text not null default 'Outro',
  valor_mensal numeric(12,2) not null check (valor_mensal >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.custos_config (
  organizacao_id uuid primary key references public.organizacoes(id) on delete cascade,
  meta_lucro_mensal numeric(12,2) not null default 0 check (meta_lucro_mensal >= 0),
  atualizado_em timestamptz not null default now()
);

alter table public.custos_recorrentes enable row level security;
alter table public.custos_config enable row level security;

drop policy if exists custos_loja on public.custos_recorrentes;
create policy custos_loja on public.custos_recorrentes for all to authenticated
  using (organizacao_id = (select organizacao_id from public.perfis where id = auth.uid()))
  with check (organizacao_id = (select organizacao_id from public.perfis where id = auth.uid()));

drop policy if exists custos_config_loja on public.custos_config;
create policy custos_config_loja on public.custos_config for all to authenticated
  using (organizacao_id = (select organizacao_id from public.perfis where id = auth.uid()))
  with check (organizacao_id = (select organizacao_id from public.perfis where id = auth.uid()));

grant select, insert, update, delete on public.custos_recorrentes to authenticated;
grant select, insert, update, delete on public.custos_config to authenticated;

notify pgrst, 'reload schema';
