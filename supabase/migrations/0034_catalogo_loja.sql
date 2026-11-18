-- 0034: catalogo da loja (publico)
-- endereco da loja (slug) gerado do nome; marcacao de publicacao por veiculo (opt-in)
alter table public.organizacoes add column if not exists slug text;

create or replace function public.gerar_slug(t text)
returns text language sql immutable as $$
  select trim(both '-' from lower(regexp_replace(
    translate(coalesce(t, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
    '[^a-zA-Z0-9]+', '-', 'g')))
$$;

update public.organizacoes
   set slug = public.gerar_slug(nome) || '-' || left(id::text, 4)
 where slug is null;

create unique index if not exists organizacoes_slug_key on public.organizacoes (slug);

create or replace function public.organizacao_slug_padrao()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.gerar_slug(new.nome) || '-' || left(new.id::text, 4);
  end if;
  return new;
end $$;

drop trigger if exists organizacoes_slug on public.organizacoes;
create trigger organizacoes_slug before insert or update of nome on public.organizacoes
  for each row execute function public.organizacao_slug_padrao();

alter table public.veiculos
  add column if not exists publicado_catalogo boolean not null default false,
  add column if not exists mostrar_placa boolean not null default false,
  add column if not exists descricao text;

notify pgrst, 'reload schema';
