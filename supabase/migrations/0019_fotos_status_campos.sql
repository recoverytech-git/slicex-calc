-- 1) Permissao para excluir fotos do armazenamento (mesma regra de edicao do veiculo)
drop policy if exists "veiculos_fotos_excluir_gestao" on storage.objects;
create policy "veiculos_fotos_excluir_gestao" on storage.objects
  for delete to authenticated
  using (bucket_id = 'veiculos-fotos' and public.pode_editar_veiculo(((storage.foldername(name))[2])::uuid));

-- 2) Novos campos do veiculo
alter table public.veiculos add column if not exists numero_motor text;
alter table public.veiculos add column if not exists categoria text;

-- 3) Obrigatoriedade dos valores para novos cadastros e alteracoes
--    (NOT VALID: nao bloqueia registros antigos, mas vale para inserts e updates a partir de agora)
alter table public.veiculos add constraint veiculos_valor_fipe_obrigatorio
  check (valor_fipe is not null) not valid;
alter table public.veiculos add constraint veiculos_venda_pretendida_obrigatoria
  check (preco_venda_pretendido is not null) not valid;
