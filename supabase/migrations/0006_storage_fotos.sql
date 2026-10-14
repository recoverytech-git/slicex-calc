-- 0006 — Políticas do bucket veiculos-fotos.
-- EXECUTAR SOMENTE DEPOIS de conferir a consulta de policies do storage (ver instruções).
-- Caminho obrigatório dos arquivos: {organizacao_id}/{veiculo_id}/{arquivo}

drop policy if exists "fotos_select_org" on storage.objects;
drop policy if exists "fotos_insert_gestao" on storage.objects;
drop policy if exists "fotos_delete_gestao" on storage.objects;

create policy "fotos_select_org" on storage.objects
  for select to authenticated
  using (bucket_id = 'veiculos-fotos'
    and (storage.foldername(name))[1] = public.minha_organizacao()::text);

create policy "fotos_insert_gestao" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'veiculos-fotos'
    and (storage.foldername(name))[1] = public.minha_organizacao()::text
    and public.meu_papel() in ('proprietario','gerente','admin_master'));

create policy "fotos_delete_gestao" on storage.objects
  for delete to authenticated
  using (bucket_id = 'veiculos-fotos'
    and (storage.foldername(name))[1] = public.minha_organizacao()::text
    and public.meu_papel() in ('proprietario','gerente','admin_master'));
