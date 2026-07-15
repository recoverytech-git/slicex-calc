import * as XLSX from "xlsx";
import { fmtN } from "./format";

export const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function calcPrice(pv, taxa, n) {
  const i = taxa / 100;
  const pmt = (pv * i) / (1 - Math.pow(1 + i, -n));
  let saldo = pv;
  return Array.from({ length: n }, (_, k) => {
    const juros = saldo * i, amort = pmt - juros;
    saldo = Math.max(0, saldo - amort);
    return { mes: k + 1, parcela: pmt, juros, amortizacao: amort, saldo };
  });
}

export function calcSAC(pv, taxa, n) {
  const i = taxa / 100, amort = pv / n;
  let saldo = pv;
  return Array.from({ length: n }, (_, k) => {
    const juros = saldo * i, parcela = amort + juros;
    saldo = Math.max(0, saldo - amort);
    return { mes: k + 1, parcela, juros, amortizacao: amort, saldo };
  });
}

export function buildXLSX(rows, pv, taxaNum, n, entNum, totalPago, totalJuros, sistema) {
  const taxaAnual = ((Math.pow(1 + taxaNum / 100, 12) - 1) * 100).toFixed(2);
  const isSAC = sistema === "SAC";
  const wb = XLSX.utils.book_new();

  const resumo = [
    [`SIMULAÇÃO DE FINANCIAMENTO – SISTEMA ${sistema}`],
    ["Gerado em:", new Date().toLocaleString("pt-BR")],
    [],
    ["PARÂMETROS"],
    ["Valor do bem (R$)", fmtN(pv + entNum)],
    ["Entrada (R$)", fmtN(entNum)],
    ["Valor financiado (R$)", fmtN(pv)],
    ["Taxa de juros mensal", `${taxaNum}%`],
    ["Taxa de juros anual (equiv.)", `${taxaAnual}%`],
    ["Prazo (meses)", n],
    ["Sistema de amortização", sistema],
    [],
    ["RESULTADOS"],
    isSAC
      ? ["1ª Parcela (R$)", parseFloat(rows[0].parcela.toFixed(2))]
      : ["Parcela mensal (R$)", parseFloat(rows[0].parcela.toFixed(2))],
    ...(isSAC ? [["Última Parcela (R$)", parseFloat(rows[rows.length - 1].parcela.toFixed(2))]] : []),
    ["Total a pagar (R$)", parseFloat(totalPago.toFixed(2))],
    ["Total de juros (R$)", parseFloat(totalJuros.toFixed(2))],
    ["Custo efetivo total", `${((totalJuros / pv) * 100).toFixed(2)}%`],
  ];
  const wsR = XLSX.utils.aoa_to_sheet(resumo);
  wsR["!cols"] = [{ wch: 32 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsR, "Resumo");

  const wsT = XLSX.utils.aoa_to_sheet([
    ["Mês", "Parcela (R$)", "Juros (R$)", "Amortização (R$)", "Saldo Devedor (R$)"],
    ...rows.map((r) => [
      r.mes,
      parseFloat(r.parcela.toFixed(2)),
      parseFloat(r.juros.toFixed(2)),
      parseFloat(r.amortizacao.toFixed(2)),
      parseFloat(r.saldo.toFixed(2)),
    ]),
    [],
    ["TOTAL", parseFloat(totalPago.toFixed(2)), parseFloat(totalJuros.toFixed(2)), parseFloat(pv.toFixed(2)), "—"],
  ]);
  wsT["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsT, "Evolução da Dívida");

  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

export async function downloadXLSX(blob, filename) {
  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "Planilha Excel (.xlsx)", accept: { [MIME]: [".xlsx"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { ok: true, method: "picker" };
    } catch (e) {
      if (e.name === "AbortError") return { ok: false, method: "abort" };
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.cssText = "position:fixed;opacity:0;pointer-events:none;z-index:-1";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { ok: true, method: "blob" };
}
