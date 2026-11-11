-- 0022: colunas usadas pelo registro de venda (estoque e detalhe do veiculo)
-- idempotente: pode ser executada mais de uma vez sem efeito colateral
alter table public.veiculo_vendas
  add column if not exists registrado_por uuid references auth.users(id),
  add column if not exists observacoes text,
  add column if not exists despesas_venda numeric(12,2) default 0,
  add column if not exists descontos numeric(12,2) default 0;

-- recarrega o cache do PostgREST para reconhecer as colunas
notify pgrst, 'reload schema';
