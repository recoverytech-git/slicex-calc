-- 0029: exclusao definitiva de veiculo e venda (somente administrador master)
create or replace function public.excluir_veiculo_definitivo(p_veiculo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin_master') then
    raise exception 'Apenas o administrador master pode excluir vendas e veículos.';
  end if;
  delete from public.veiculo_vendas where veiculo_id = p_veiculo;
  delete from public.veiculo_custos where veiculo_id = p_veiculo;
  delete from public.veiculo_financiamentos where veiculo_id = p_veiculo;
  delete from public.veiculo_historico where veiculo_id = p_veiculo;
  delete from public.veiculos where id = p_veiculo;
end $$;

revoke all on function public.excluir_veiculo_definitivo(uuid) from public;
grant execute on function public.excluir_veiculo_definitivo(uuid) to authenticated;

notify pgrst, 'reload schema';
