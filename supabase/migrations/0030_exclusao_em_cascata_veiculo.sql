-- 0030: exclusao definitiva do veiculo com tudo que esta ligado a ele
-- 1) toda tabela que depende de veiculos (direta ou por cadeia) passa a excluir em cascata
do $$
declare
  alvo text[] := array['veiculos'];
  n int;
  c record;
  def text;
begin
  loop
    n := array_length(alvo, 1);
    for c in
      select src.relname as origem
      from pg_constraint con
      join pg_class src on src.oid = con.conrelid
      join pg_class ref on ref.oid = con.confrelid
      join pg_namespace ns on ns.oid = src.relnamespace
      where con.contype = 'f' and ns.nspname = 'public' and ref.relname = any(alvo)
    loop
      if not (c.origem = any(alvo)) then alvo := alvo || c.origem; end if;
    end loop;
    exit when array_length(alvo, 1) = n;
  end loop;

  for c in
    select con.conname, src.relname as tabela, pg_get_constraintdef(con.oid) as definicao
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_class ref on ref.oid = con.confrelid
    join pg_namespace ns on ns.oid = src.relnamespace
    where con.contype = 'f' and ns.nspname = 'public' and ref.relname = any(alvo)
  loop
    def := regexp_replace(c.definicao, '\s+ON DELETE (CASCADE|SET NULL|SET DEFAULT|RESTRICT|NO ACTION)', '', 'i');
    execute format('alter table public.%I drop constraint %I', c.tabela, c.conname);
    execute format('alter table public.%I add constraint %I %s on delete cascade', c.tabela, c.conname, def);
  end loop;
end $$;

-- 2) funcao de exclusao: confere permissao, apaga fotos do armazenamento e o veiculo (cascata cuida do resto)
create or replace function public.excluir_veiculo_definitivo(p_veiculo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin_master') then
    raise exception 'Apenas o administrador master pode excluir vendas e veículos.';
  end if;
  -- fotos: o caminho dos arquivos contem o id do veiculo (organizacao/veiculo/arquivo)
  delete from storage.objects where name like '%/' || p_veiculo::text || '/%';
  delete from public.veiculos where id = p_veiculo;
end $$;

revoke all on function public.excluir_veiculo_definitivo(uuid) from public;
grant execute on function public.excluir_veiculo_definitivo(uuid) to authenticated;

notify pgrst, 'reload schema';
