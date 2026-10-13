# Arquitetura — SliceX.calc / Calcula-Car

Documento gerado a partir da auditoria real do código (commit `d2aa500`).

## Stack

- React 19 + Vite 7.3.6 (fixado; Vite 8.1.x tem regressão no resolvedor — ver CHANGELOG).
- React Router 7 com rotas `lazy` (code-splitting por página).
- Framer Motion (transições, animações).
- lucide-react (ícones gráficos — nunca emojis na interface).
- xlsx (exportação Excel) e jsPDF + jspdf-autotable (exportação PDF), carregados sob demanda.
- Deploy: GitHub `recoverytech-git/slicex-calc` → Vercel (deploy automático a cada push na `main`).

## Estrutura

```
src/
  App.jsx              rotas (lazy) + transição entre páginas
  main.jsx             ponto de entrada
  index.css            tokens do design system (--bg, --surface, --text, --border, --r-*, --shadow-*)
  pages/
    Home.jsx           grid de módulos (cards)
    Financiamento.jsx  calculadora Price/SAC
    Percentual.jsx     diferença percentual entre dois valores
    Amortizacao.jsx    simulador de amortização extra (reduzir prazo x parcela)
    CalculaCar.jsx     análise de compra e venda de veículos
  components/          peças reutilizáveis (ver tabela abaixo)
  lib/                 lógica pura, sem React (testável isoladamente)
    financiamento.js   calcPrice, calcSAC, buildXLSX, downloadXLSX
    amortizacao.js     calcAmortizacaoExtra
    calculaCar.js      calcDiferenca, calcResultado, buildCalculaCarXLSX, buildCalculaCarPDF
    percentual.js      calcPercentual
    moeda.js           formatarBRL, parseMoeda, mascararDigitacao (fonte única de moeda)
    format.js          fmt, fmtN, fmtK, toF (legado, ainda em uso)
```

## Componentes reutilizáveis

| Componente | Uso |
|---|---|
| `Field` | campo de texto/numérico genérico |
| `MoneyField` | campo monetário padrão (máscara BRL, valor numérico separado) |
| `CurrencyField` | campo monetário da seção de custos (legado; ver pendências) |
| `Kpi` | card de indicador com número animado |
| `PrimaryButton` | botão principal do design system |
| `Modal` | modal genérico (usado na seção de custos do Calcula-Car) |
| `SaldoAreaChart` / `ComposicaoBarChart` | gráficos SVG sem dependência externa |
| `Header`, `BackLink`, `PageTransition`, `ModuleCard` | navegação e layout |

## Fluxo de dados

Interface (página) → estado local (`useState`, valores em string) → conversão para número (`toF`/`parseMoeda`) → funções puras de `lib/` → resultado → interface e exportação.

**Não há backend.** Todos os cálculos rodam no navegador. Nenhum dado é enviado a servidor.

## Persistência

**Nenhuma.** Os dados vivem apenas na memória da página e se perdem ao recarregar. Não há banco de dados, autenticação nem armazenamento de arquivos neste momento.

## Integrações configuradas

- GitHub: repositório oficial, branch `main`.
- Vercel: projeto `slicex-calc`, deploy automático via integração GitHub.
- Supabase: **não configurado** no repositório (sem cliente, sem variáveis de ambiente).

## Testes e qualidade

- Lint: `npm run lint` (oxlint) — 0 erros, 6 avisos de estilo em código existente.
- Build: `npm run build` — sem erros.
- Testes automatizados: **nenhum framework configurado**. Os testes atuais são scripts de verificação manual em `/tmp`, não versionados.
