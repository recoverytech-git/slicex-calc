-- Fase 4/5 — Veículos (estoque). Depende de 0001_fundacao.sql.
-- Reversível: ver 0002_veiculos.down.sql.

create table if not exists public.veiculos (
  id                      uuid primary key default gen_random_uuid(),
  organizacao_id          uuid references public.organizacoes(id) on delete restrict,
  modelo                  text not null,
  placa                   text,
  renavam                 text,
  chassi                  text,
  ano_fabricacao          int,
  ano_modelo              int,
  cor                     text,
  quilometragem           int,
  combustivel             text,
  cambio                  text,
  preco_compra            numeric(14,2),
  valor_fipe              numeric(14,2),
  preco_venda_pretendido  numeric(14,2),
  tipo_aquisicao          text check (tipo_aquisicao in ('capital_proprio','financiamento')),
  status                  text not null default 'em_preparacao'
                          check (status in ('em_preparacao','disponivel','reservado','vendido','retirado')),
  observacoes             text,
  criado_por              uuid references auth.users(id),
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now()
);

-- Identificadores não podem se repetir dentro da mesma organização (ignora nulos)
create unique index if not exists veiculos_placa_org_uk
  on public.veiculos (organizacao_id, placa) where placa is not null;
create unique index if not exists veiculos_renavam_org_uk
  on public.veiculos (organizacao_id, renavam) where renavam is not null;
create unique index if not exists veiculos_chassi_org_uk
  on public.veiculos (organizacao_id, chassi) where chassi is not null;

alter table public.veiculos enable row level security;

-- Leitura: qualquer usuário ativo da organização vê o estoque
create policy "veiculos_select_org" on public.veiculos
  for select to authenticated using (organizacao_id = public.minha_organizacao());

-- Escrita: somente papéis de gestão (proprietario, gerente) da mesma organização
create policy "veiculos_insert_gestao" on public.veiculos
  for insert to authenticated
  with check (organizacao_id = public.minha_organizacao() and public.meu_papel() in ('proprietario','gerente','admin_master'));

create policy "veiculos_update_gestao" on public.veiculos
  for update to authenticated
  using (organizacao_id = public.minha_organizacao() and public.meu_papel() in ('proprietario','gerente','admin_master'))
  with check (organizacao_id = public.minha_organizacao());

-- Sem política de DELETE: exclusão não é permitida pelo cliente (histórico preservado).
