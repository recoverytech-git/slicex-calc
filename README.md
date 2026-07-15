# SliceX.calc

Calculadoras financeiras — Financiamento (Price/SAC), Diferença Percentual e
Amortização Extra. React + Vite, paleta monocromática, animações com
Framer Motion.

## Stack

- **React 19** + **React Router 7** (rotas por calculadora, code-split)
- **Framer Motion** — transições de página, hover, contadores animados
- **xlsx** — exportação de planilhas (.xlsx) com Resumo + Evolução da Dívida
- **lucide-react** — ícones
- Gráficos em **SVG puro**, sem dependência externa de charting

## Desenvolvimento

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # gera dist/
npm run preview    # serve o build de producao localmente
```

## Estrutura

```
src/
  lib/            cálculos puros (financiamento, percentual, amortização)
  components/     peças reutilizáveis (Field, Kpi, gráficos SVG, etc.)
  pages/          uma página por calculadora + Home (grid de módulos)
  App.jsx         rotas (lazy-loaded por página)
```

## Deploy

Conectado à Vercel via importação deste repositório GitHub. Todo push na
branch `main` gera um novo deploy de produção automaticamente.

`vercel.json` contém o rewrite necessário para o roteamento client-side
(React Router) funcionar corretamente em rotas diretas (ex: `/financiamento`).

## Módulos

1. **Financiamento** — simula Price ou SAC, gráficos de evolução/composição,
   exporta Excel com `showSaveFilePicker` (fallback automático para download
   tradicional quando a API não está disponível).
2. **Diferença Percentual** — compara dois valores em ambas as direções,
   mais a diferença percentual simétrica (base na média).
3. **Amortização Extra** — dado um aporte extra sobre o saldo devedor atual,
   compara reduzir prazo vs. reduzir parcela, mostrando a diferença de juros
   totais entre as duas estratégias.
