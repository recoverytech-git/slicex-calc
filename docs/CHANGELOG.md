# Changelog

## Fase 1 — Auditoria e testes (esta entrega)
- Adicionado `docs/ARCHITECTURE.md` (arquitetura real, sem Supabase).
- Adicionado `docs/FINANCIAL_RULES.md` (fórmulas implementadas e divergências).
- Adicionado `docs/ROADMAP.md` (status por fase e decisões pendentes).
- Adicionado `tests/financeiro.test.js` (16 testes das fórmulas) com `vitest`.
- Script `npm test` adicionado.
- Nenhuma fórmula financeira foi alterada.

## d2aa500 — padronização monetária
- Taxa de juros de financiamento padrão 3,9%.
- Campos monetários com máscara BRL (`MoneyField`).

## 568a84f — Calcula-Car, seção de custos em modal
- Campos de custo substituídos por modal.

## f17e7ab — módulo Calcula-Car
- Análise de compra e venda de veículos.
