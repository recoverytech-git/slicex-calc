import { formatarCPF, formatarTelefone, soDigitos } from "./mascaras";

/** Estrutura da ficha financeira (fonte única para formulário, PDF, PNG e Excel). */
export const SECOES = [
  { titulo: "1. Dados pessoais", campos: [
    ["nome", "Nome completo"], ["mae", "Nome da mãe"], ["rg", "RG"], ["cpf", "CPF", "cpf"],
    ["nascimento", "Data de nascimento"], ["telefone", "Telefone / WhatsApp", "tel"], ["estado_civil", "Estado civil"],
    ["email", "E-mail"], ["cep", "CEP"], ["endereco", "Endereço residencial"], ["numero", "Nº"],
    ["complemento", "Complemento"], ["bairro", "Bairro"], ["cidade", "Cidade"], ["uf", "UF"],
    ["tempo_residencia", "Tempo de residência"], ["cnh", "Possui CNH", "bool"],
  ]},
  { titulo: "2. Dados financeiros e ocupacionais", campos: [
    ["empresa", "Nome da empresa"], ["admissao", "Data de admissão"], ["profissao", "Profissão"],
    ["cargo", "Cargo"], ["renda", "Renda", "money"], ["renda_adicional", "Renda adicional", "money"],
    ["contato_empresa", "Contato da empresa"],
  ]},
  { titulo: "3. Dados do veículo", campos: [
    ["placa", "Placa"], ["renavam", "RENAVAM"], ["modelo", "Modelo"], ["ano_modelo", "Ano/modelo"],
    ["cor", "Cor"], ["valor_veiculo", "Valor do veículo", "money"], ["valor_entrada", "Valor de entrada", "money"],
    ["valor_financiar", "Valor a financiar", "money"],
  ]},
];

export const FICHA_VAZIA = Object.fromEntries(SECOES.flatMap((s) =>
  s.campos.map(([k, , tipo]) => [k, tipo === "bool" ? null : tipo === "money" ? 0 : ""])));

const dinheiro = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function textoValor(v, tipo) {
  if (tipo === "bool") return v === true ? "Sim" : v === false ? "Não" : "—";
  if (tipo === "money") return v ? dinheiro(v) : "—";
  if (tipo === "cpf") return v ? formatarCPF(v) : "—";
  if (tipo === "tel") return v ? formatarTelefone(v) : "—";
  return v ? String(v) : "—";
}

/** Seções com linhas [rótulo, valor] já formatadas, para exportar. */
export function linhasFicha(dados = {}) {
  return SECOES.map((s) => ({
    titulo: s.titulo,
    linhas: s.campos.map(([k, rotulo, tipo]) => [rotulo, textoValor(dados[k], tipo)]),
  }));
}

export function nomeArquivo(registro, ext) {
  const base = (registro.nome || "cliente").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `ficha-${base}.${ext}`;
}

export function baixar(url, nome) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** PDF com uma ficha por página. Recebe jsPDF e autoTable já carregados. */
export function gerarPdf(registros, jsPDF, autoTable) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registros.forEach((r, idx) => {
    if (idx > 0) doc.addPage();
    doc.setFillColor(14, 26, 46);
    doc.rect(0, 0, 210, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("CALCULA.CAR · Ficha financeira", 14, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${r.nome || ""}  ·  CPF ${r.cpf ? formatarCPF(r.cpf) : "—"}  ·  ${new Date().toLocaleDateString("pt-BR")}`, 14, 20);
    let y = 32;
    linhasFicha(r.dados ?? {}).forEach((sec) => {
      doc.setTextColor(68, 147, 248);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(sec.titulo, 14, y);
      autoTable(doc, {
        startY: y + 2,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9, cellPadding: 1.8 },
        body: sec.linhas,
        columnStyles: { 0: { textColor: [90, 90, 90], cellWidth: 70 }, 1: { fontStyle: "bold" } },
        theme: "plain",
      });
      y = doc.lastAutoTable.finalY + 8;
    });
  });
  return doc;
}

/** PNG de uma ficha, desenhado em canvas (sem depender de biblioteca externa). */
export function gerarPngBlob(registro) {
  const secoes = linhasFicha(registro.dados ?? {});
  const W = 1000, pad = 48, linhaH = 30, tituloH = 46;
  const H = 150 + secoes.reduce((s, sec) => s + tituloH + sec.linhas.length * linhaH + 24, 0) + 30;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#0E1A2E";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#ffffff";
  g.font = "bold 30px sans-serif";
  g.fillText("CALCULA.CAR · Ficha financeira", pad, 64);
  g.fillStyle = "#9198A1";
  g.font = "18px sans-serif";
  g.fillText(`${registro.nome || ""}  ·  CPF ${registro.cpf ? formatarCPF(registro.cpf) : "—"}`, pad, 100);
  let y = 140;
  secoes.forEach((sec) => {
    g.fillStyle = "#4493F8";
    g.font = "bold 20px sans-serif";
    g.fillText(sec.titulo, pad, y + 26);
    y += tituloH;
    sec.linhas.forEach(([rotulo, valor]) => {
      g.fillStyle = "#9198A1";
      g.font = "16px sans-serif";
      g.textAlign = "left";
      g.fillText(rotulo, pad, y + 20);
      g.fillStyle = "#ffffff";
      g.font = "bold 16px sans-serif";
      g.textAlign = "right";
      g.fillText(valor, W - pad, y + 20);
      y += linhaH;
    });
    y += 24;
  });
  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}

/** Linha plana para Excel: uma coluna por campo da ficha. */
export function linhaExcel(registro) {
  const linha = { Nome: registro.nome || "", CPF: registro.cpf ? formatarCPF(registro.cpf) : "", Telefone: registro.telefone ? formatarTelefone(registro.telefone) : "" };
  linhasFicha(registro.dados ?? {}).forEach((sec) => sec.linhas.forEach(([rotulo, valor]) => { linha[rotulo] = valor; }));
  return linha;
}

export { soDigitos };
