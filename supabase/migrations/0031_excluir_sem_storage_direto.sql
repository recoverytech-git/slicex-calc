-- 0031: a exclusao no banco nao apaga arquivos do Storage (o Supabase bloqueia essa operacao).
-- As fotos sao removidas pela API de armazenamento, antes desta funcao ser chamada.
create or replace function public.excluir_veiculo_definitivo(p_veiculo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin_master') then
    raise exception 'Apenas o administrador master pode excluir vendas e veículos.';
  end if;
  delete from public.veiculos where id = p_veiculo;
end $$;

revoke all on function public.excluir_veiculo_definitivo(uuid) from public;
grant execute on function public.excluir_veiculo_definitivo(uuid) to authenticated;

notify pgrst, 'reload schema';
