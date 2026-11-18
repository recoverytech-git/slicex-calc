-- 0036: localizacao do veiculo (cidade e UF) exibida no catalogo
alter table public.veiculos add column if not exists cidade text, add column if not exists uf text;
notify pgrst, 'reload schema';
