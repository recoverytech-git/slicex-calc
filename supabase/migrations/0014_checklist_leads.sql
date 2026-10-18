-- 0014 — Checklist alinhado com a tela e tabela de leads (fichas financeiras).
-- Executar DEPOIS da 0013. Tudo em uma transação.

begin;

-- 1. Checklist: valores de documentação aceitos = os que a tela usa
update public.veiculo_checklists set documentacao_status = 'nao_informado'
  where documentacao_status is null or documentacao_status not in ('conferida','pendente','nao_informado');
alter table public.veiculo_checklists drop constraint if exists veiculo_checklists_documentacao_status_check;
alter table public.veiculo_checklists add constraint veiculo_checklists_documentacao_status_check
  check (documentacao_status in ('conferida','pendente','nao_informado'));

-- 2. Leads = fichas financeiras salvas
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid references public.organizacoes(id) on delete restrict,
  criado_por uuid references auth.users(id),
  nome text not null,
  cpf text,
  telefone text,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);
create index if not exists leads_org_criado_idx on public.leads (organizacao_id, criado_em desc);
create index if not exists leads_cpf_idx on public.leads (cpf);
create index if not exists leads_nome_idx on public.leads (nome);

alter table public.leads enable row level security;

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select to authenticated using (
  public.meu_papel() = 'admin_master'
  or (organizacao_id = public.minha_organizacao() and (
        public.meu_papel() in ('proprietario','gerente')
        or (public.meu_papel() = 'vendedor' and criado_por = auth.uid()))));

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert to authenticated with check (
  public.meu_papel() = 'admin_master'
  or (organizacao_id = public.minha_organizacao() and criado_por = auth.uid()));

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update to authenticated
  using (public.meu_papel() = 'admin_master'
         or (organizacao_id = public.minha_organizacao() and public.meu_papel() in ('proprietario','gerente')))
  with check (public.meu_papel() = 'admin_master'
         or (organizacao_id = public.minha_organizacao() and public.meu_papel() in ('proprietario','gerente')));

drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete to authenticated using (public.meu_papel() = 'admin_master');

grant select, insert, update, delete on public.leads to authenticated;
revoke all on public.leads from anon;

drop trigger if exists trg_log_leads on public.leads;
create trigger trg_log_leads after insert or update or delete on public.leads
  for each row execute function public.registrar_log();

commit;
