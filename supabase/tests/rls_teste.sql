-- Testes de RLS. Rodar no SQL Editor. Substitua os UUIDs pelos reais antes.
-- Cada bloco diz o resultado esperado.

-- T1: visitante anônimo não lê veículos (esperado: erro de permissão)
set local role anon;
select count(*) from public.veiculos;
reset role;

-- T2: vendedor lê só a própria organização (esperado: número > 0 apenas dos veículos da org)
-- Substitua UUID_VENDEDOR pelo id do usuário com papel 'vendedor'.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','UUID_VENDEDOR','role','authenticated')::text, true);
select count(*) from public.veiculos;
reset role;

-- T3: vendedor NÃO grava veículo (esperado: erro "new row violates row-level security policy")
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','UUID_VENDEDOR','role','authenticated')::text, true);
insert into public.veiculos (organizacao_id, modelo) values (public.minha_organizacao(), 'Teste RLS');
reset role;

-- T4: vendedor NÃO altera papel de ninguém (esperado: 0 linhas afetadas)
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','UUID_VENDEDOR','role','authenticated')::text, true);
update public.perfis set papel = 'admin_master' where id = 'UUID_VENDEDOR';
reset role;

-- T5: nenhum papel pode apagar veículo pelo cliente (esperado: erro de permissão)
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','UUID_GERENTE','role','authenticated')::text, true);
delete from public.veiculos where modelo = 'Teste RLS';
reset role;
