-- 0003 — Recupera a tabela organizacoes e completa o esquema.
-- Seguro para executar mais de uma vez.

create extension if not exists "pgcrypto";

create table if not exists public.organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.organizacoes enable row level security;

drop policy if exists "org_select_propria" on public.organizacoes;
create policy "org_select_propria" on public.organizacoes
  for select to authenticated using (id = public.minha_organizacao());

insert into public.organizacoes (nome)
select 'Loja Principal'
where not exists (select 1 from public.organizacoes where nome = 'Loja Principal');

do $$
begin
  if to_regclass('public.perfis') is not null
     and not exists (select 1 from pg_constraint where conname = 'perfis_organizacao_fk') then
    alter table public.perfis add constraint perfis_organizacao_fk
      foreign key (organizacao_id) references public.organizacoes(id) on delete restrict;
  end if;

  if to_regclass('public.veiculos') is not null then
    if not exists (select 1 from pg_constraint where conname = 'veiculos_organizacao_fk') then
      alter table public.veiculos add constraint veiculos_organizacao_fk
        foreign key (organizacao_id) references public.organizacoes(id) on delete restrict;
    end if;
    alter table public.veiculos alter column organizacao_id set default public.minha_organizacao();
    alter table public.veiculos alter column criado_por set default auth.uid();
  end if;
end $$;

insert into public.perfis (id, organizacao_id, nome, papel)
select u.id, o.id, 'Admin Master', 'admin_master'
from auth.users u
cross join lateral (select id from public.organizacoes where nome = 'Loja Principal' limit 1) o
where u.email = 'adminmaster@gmail.com'
on conflict (id) do update
  set organizacao_id = excluded.organizacao_id, papel = 'admin_master', ativo = true;

-- Verificação: deve retornar 1 linha com papel admin_master
select u.email, p.papel, p.ativo, o.nome as organizacao
from public.perfis p
join auth.users u on u.id = p.id
left join public.organizacoes o on o.id = p.organizacao_id
where u.email = 'adminmaster@gmail.com';
