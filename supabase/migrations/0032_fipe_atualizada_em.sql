-- 0032: data da ultima atualizacao do valor FIPE (preenchida automaticamente)
alter table public.veiculos add column if not exists valor_fipe_atualizado_em timestamptz;
update public.veiculos set valor_fipe_atualizado_em = coalesce(valor_fipe_atualizado_em, criado_em, now());

create or replace function public.marcar_fipe_atualizada()
returns trigger language plpgsql as $$
begin
  if new.valor_fipe is distinct from old.valor_fipe then
    new.valor_fipe_atualizado_em := now();
  end if;
  return new;
end $$;

drop trigger if exists veiculos_fipe_data on public.veiculos;
create trigger veiculos_fipe_data before update of valor_fipe on public.veiculos
  for each row execute function public.marcar_fipe_atualizada();

notify pgrst, 'reload schema';
