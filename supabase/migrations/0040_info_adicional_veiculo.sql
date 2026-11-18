-- 0040: informacoes adicionais do veiculo, exibidas no marketplace somente se a loja ativar
alter table public.veiculos
  add column if not exists info_adicional text,
  add column if not exists mostrar_info_adicional boolean not null default false;
notify pgrst, 'reload schema';
