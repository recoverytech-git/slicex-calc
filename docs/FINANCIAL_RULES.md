# Regras financeiras — documentadas a partir do código

Estas são as fórmulas implementadas hoje. **Não foram alteradas.** Divergências são listadas na última seção.

## 1. Sistema Price (`calcPrice` em `lib/financiamento.js`)

- Taxa mensal: `i = taxa / 100`
- Parcela fixa: `PMT = PV · i / (1 − (1 + i)^−n)`
- Por mês: `juros = saldo · i`; `amortização = PMT − juros`; `saldo = max(0, saldo − amortização)`
- Arredondamento: nenhum na geração; formatação apenas na exibição (2 casas).

**Verificado:** PV = 50.000, taxa = 1,20% a.m., n = 48 → parcela R$ 1.376,38; juros totais R$ 16.066,12.

## 2. Sistema SAC (`calcSAC`)

- Amortização constante: `amort = PV / n`
- Por mês: `juros = saldo · i`; `parcela = amort + juros`; `saldo = max(0, saldo − amort)`

**Verificado:** PV = 50.000, taxa = 1,20% a.m., n = 48 → 1ª parcela R$ 1.641,67; última R$ 1.054,17; juros totais R$ 14.700,00.

## 3. Taxa anual equivalente

`taxaAnual = ((1 + taxaMensal/100)^12 − 1) × 100` — exibida com 2 casas.

## 4. Amortização extra (`calcAmortizacaoExtra` em `lib/amortizacao.js`)

- `saldoNovo = saldoDevedor − aporte`
- Cenário base: cronograma do saldo original, com o mesmo sistema.
- **Estratégia 1 — reduzir prazo:** mantém a parcela original (Price) ou a amortização mensal original (SAC) e recalcula quantos meses faltam.
- **Estratégia 2 — reduzir parcela:** mantém o prazo e recalcula a parcela sobre o `saldoNovo`.
- Juros economizados = juros do cenário base − juros da estratégia.

## 5. Diferença percentual (`calcPercentual` em `lib/percentual.js`)

- Diferença absoluta: `|a − b|`
- Variação A→B: `(b − a) / |a| × 100` (nula se a = 0)
- Variação B→A: `(a − b) / |b| × 100` (nula se b = 0)
- Diferença simétrica: `|a − b| / |média| × 100` (nula se média = 0)

## 6. Calcula-Car (`lib/calculaCar.js`)

- Diferença em reais: `FIPE − compra`
- Diferença percentual: `(FIPE − compra) / FIPE × 100` (nula se FIPE = 0)
- Alerta de margem: `diferença % < 15` → **somente alerta visual, nunca bloqueia**.
- Custos adicionais: soma simples dos itens.
- Custo financeiro: total de juros do financiamento (0 em capital próprio).
- Investimento total: `compra + custos adicionais + custo financeiro`
- Custos totais: `custos adicionais + custo financeiro`
- Margem potencial: `FIPE − compra`
- **Valor de venda considerado: sempre o valor FIPE** (premissa atual; não configurável ainda).
- Resultado líquido estimado: `valor de venda − investimento total`
- Margem final (%): `resultado líquido / FIPE × 100`

**Verificado:** FIPE 75.000, compra 50.000, custos 4.950, financiamento de 50.000 a 1,20% em 48 meses → custo financeiro 16.066,12; investimento total 71.016,12; resultado líquido 3.983,88.

## Divergências e pontos de atenção

1. **Taxa padrão alterada para 3,9%** nos campos de juros de financiamento (Financiamento, Amortização, Calcula-Car), conforme a regra de padronização. As fórmulas não mudam; só o valor inicial do campo.

2. **Resultado líquido não considera despesas de venda, impostos nem comissões**, porque não há campos para isso. Por isso o resultado é uma **estimativa**, não lucro realizado.

3. **O valor de venda é sempre o FIPE.** Um veículo vendido por outro valor não pode ser simulado sem alterar a premissa.

4. **Custo financeiro = juros totais.** O custo de oportunidade do capital próprio não é considerado (correto para a V1, mas deve ser explícito ao usuário).

5. **Arredondamento:** as fórmulas trabalham em ponto flutuante sem arredondamento intermediário. Diferenças de centavos entre sistemas externos são possíveis; a referência de validação é o cálculo do Banco Central, que bateu nas duas capturas de tela.
