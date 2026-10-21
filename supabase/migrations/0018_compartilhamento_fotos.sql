-- Links de compartilhamento de fotos do veiculo (validade de 24 horas)
create table if not exists public.compartilhamentos_fotos (
  token text primary key default replace(gen_random_uuid()::text, '-', ''),
  veiculo_id uuid not null references public.veiculos(id) on delete cascade,
  organizacao_id uuid,
  criado_por uuid,
  titulo text,
  urls jsonb not null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null
);

alter table public.compartilhamentos_fotos enable row level security;

drop policy if exists compartilhamento_criar on public.compartilhamentos_fotos;
create policy compartilhamento_criar on public.compartilhamentos_fotos
  for insert to authenticated
  with check (criado_por = auth.uid());

drop policy if exists compartilhamento_ver_proprio on public.compartilhamentos_fotos;
create policy compartilhamento_ver_proprio on public.compartilhamentos_fotos
  for select to authenticated
  using (criado_por = auth.uid());

-- Leitura publica somente por token valido e dentro da validade
create or replace function public.obter_galeria_veiculo(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('titulo', c.titulo, 'urls', c.urls, 'expira_em', c.expira_em)
  from public.compartilhamentos_fotos c
  where c.token = p_token and c.expira_em > now()
  limit 1;
$$;

grant execute on function public.obter_galeria_veiculo(text) to anon, authenticated;
