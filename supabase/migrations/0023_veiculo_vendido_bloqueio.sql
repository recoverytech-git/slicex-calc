-- 0023: veiculo vendido
-- 1) corrige veiculos que ja tem venda registrada mas ficaram com outro status
update public.veiculos v
   set status = 'vendido'
 where exists (select 1 from public.veiculo_vendas vd where vd.veiculo_id = v.id)
   and v.status not in ('vendido', 'retirado');

-- 2) depois de vendido, o status so pode ser alterado para 'retirado'
create or replace function public.bloquear_status_veiculo_vendido()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status
     and new.status not in ('vendido', 'retirado')
     and exists (select 1 from public.veiculo_vendas vd where vd.veiculo_id = old.id) then
    raise exception 'Veículo vendido: o status só pode ser alterado para Retirado.';
  end if;
  return new;
end $$;

drop trigger if exists veiculos_bloqueia_status_vendido on public.veiculos;
create trigger veiculos_bloqueia_status_vendido
  before update of status on public.veiculos
  for each row execute function public.bloquear_status_veiculo_vendido();

notify pgrst, 'reload schema';
