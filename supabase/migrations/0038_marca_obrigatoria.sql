-- 0038: marca do veiculo obrigatoria no cadastro e na alteracao (registros antigos so sao exigidos ao editar)
create or replace function public.validar_marca_veiculo()
returns trigger language plpgsql as $$
begin
  if new.marca is null or btrim(new.marca) = '' then
    raise exception 'Informe a marca do veículo.' using errcode = 'check_violation';
  end if;
  new.marca := btrim(new.marca);
  return new;
end $$;

drop trigger if exists veiculos_marca_obrigatoria on public.veiculos;
create trigger veiculos_marca_obrigatoria before insert or update of marca on public.veiculos
  for each row execute function public.validar_marca_veiculo();

notify pgrst, 'reload schema';
