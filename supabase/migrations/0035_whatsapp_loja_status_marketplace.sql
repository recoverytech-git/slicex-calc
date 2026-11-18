-- 0035: WhatsApp de contato da loja (vitrine) e lead com status proprio do marketplace
alter table public.organizacoes add column if not exists whatsapp text;
notify pgrst, 'reload schema';
