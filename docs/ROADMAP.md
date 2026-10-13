# Roadmap — evolução do SliceX.calc / Calcula-Car

Status em relação ao prompt mestre. ✅ concluído · 🔄 parcial · ⏳ pendente · ⛔ bloqueado por decisão do dono.

## Fase 1 — Auditoria ✅ (parcial no que depende de acesso)
- ✅ Estrutura, dependências, rotas e componentes mapeados.
- ✅ Arquitetura documentada (`docs/ARCHITECTURE.md`).
- ✅ Fórmulas documentadas e divergências listadas (`docs/FINANCIAL_RULES.md`).
- ✅ Lint executado (0 erros, 6 avisos de estilo).
- ⏳ Auditoria do Supabase: **bloqueada** — o repositório não tem Supabase configurado e não há acesso ao projeto daqui.

## Fase 2 — Fundação ⛔
- ⛔ Autenticação (Supabase Auth): depende de criar/conectar o projeto Supabase.
- ⛔ Perfis e permissões: depende de decisão sobre quais perfis e quais permissões existem de fato.
- ⛔ Modelo de organizações e migrações: depende do esquema aprovado.
- ⛔ RLS: depende do modelo acima.

## Fase 3 — Navegação e acesso ⏳
- ⏳ Login/logout e rotas privadas: depende da Fase 2.
- ⏳ Sidebar desktop e navegação mobile: **pode começar sem Supabase**, mas altera a identidade de navegação — requer aprovação visual.

## Fase 4 — Cadastro persistente ⛔
- ⛔ Persistência do Calcula-Car: depende da Fase 2.
- ⏳ Campos RENAVAM, chassi, checklist: podem ser desenhados já, sem persistência.
- ⛔ Fotos no Supabase Storage: depende da Fase 2.

## Fase 5 — Estoque ⛔
- ⛔ Listagem persistida, busca, filtros, prevenção de duplicidade: dependem da Fase 4.

## Fase 6 — Vendas ⛔
- ⛔ Registro de venda e resultado realizado: dependem da Fase 4 e da decisão sobre despesas de venda (ver FINANCIAL_RULES, item 2).

## Fase 7 — Indicadores e relatórios ⛔
- ⛔ Dashboard: depende das Fases 5 e 6.
- ⏳ Exportações: Excel e PDF do Calcula-Car já existem; faltam apenas as versões de relatório de estoque.

## Fase 8 — Estabilização ⏳
- ⏳ Testes automatizados das fórmulas: **podem começar já** (ver seção de testes).
- ⏳ Testes de segurança: dependem da Fase 2.

## Decisões necessárias do dono do projeto
1. Conectar um projeto Supabase existente ou criar um novo? (preciso do acesso ou das credenciais públicas do projeto — **nunca** a `service_role`).
2. Quais perfis existem de fato (admin master, proprietário, gerente, vendedor)? Quem cria o primeiro admin?
3. A loja vai operar sozinha na V1 ou já precisa de múltiplas organizações?
4. Despesas de venda, comissões e impostos entram no resultado realizado? Se sim, quais percentuais ou valores fixos?
5. O valor de venda continua sendo o FIPE, ou o usuário pode informar outro valor na simulação?
