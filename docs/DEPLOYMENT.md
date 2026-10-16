# Deploy e configuração

- Repositório: GitHub `recoverytech-git/slicex-calc`, branch `main`. Cada push publica na Vercel.
- Variáveis na Vercel (Production): `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Após alterar, faça Redeploy.
- Banco: rodar `supabase/rodar_no_supabase.sql` uma vez no SQL Editor do Supabase.
- Nunca colocar chave `service_role` no código ou em variáveis `VITE_`.
- Verificação pós-deploy: login, criar usuário, cadastrar veículo com foto, checklist e venda.
