// Base visual comum de todos os relatórios PDF do Calcula.car (mesma linguagem do sistema)
export const COR = { azul: [37, 99, 235], navy: [14, 26, 46], texto: [30, 41, 59], cinza: [100, 116, 139], borda: [226, 232, 240], fundo: [248, 250, 252], azulClaro: [239, 246, 255] };

export const brl = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
export const numero = (v) => (v == null || v === "" ? "—" : Number(v).toLocaleString("pt-BR"));
export const pct = (v) => (v == null || Number.isNaN(Number(v)) ? "—" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);

// Logomarca em PNG/JPEG (formatos aceitos pelo PDF). Sem logo válida, o cabeçalho usa o nome da marca.
export async function carregarLogo(url) {
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    if (!/png|jpe?g/.test(blob.type)) return null;
    const data = await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
    if (!data) return null;
    const ratio = await new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im.naturalWidth / im.naturalHeight || 1);
      im.onerror = () => resolve(1);
      im.src = data;
    });
    return { data, tipo: blob.type.includes("png") ? "PNG" : "JPEG", ratio };
  } catch { return null; }
}

export function novoDocumento(jsPDF, orientacao = "landscape") {
  return new jsPDF({ orientation: orientacao, unit: "mm", format: "a4" });
}

// Cabeçalho: faixa branca com logomarca, título, subtítulo e data de emissão
export function cabecalho(doc, { titulo, subtitulo, logo, meta }) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, 24, "F");
  // logomarca na proporção real (sem distorcer), altura fixa de 13 mm
  const h = 13;
  let w = 13;
  if (logo) {
    w = Math.min(40, h * (logo.ratio || 1));
    try { doc.addImage(logo.data, logo.tipo, 12, 5.5, w, h); } catch { /* segue sem logo */ }
  } else {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...COR.navy);
    doc.text("CALCULA.CAR", 12, 13);
    w = 34;
  }
  const tx = 12 + w + 6;
  doc.setDrawColor(...COR.borda); doc.setLineWidth(0.3);
  doc.line(tx - 3, 6, tx - 3, 18);
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...COR.navy);
  doc.text(titulo, tx, 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...COR.cinza);
  doc.text(subtitulo, tx, 17.5);
  doc.setFontSize(7.5);
  doc.text(meta || `Emitido em ${new Date().toLocaleString("pt-BR")}`, W - 12, 12, { align: "right" });
  doc.setFillColor(...COR.azul);
  doc.rect(0, 24, W, 1, "F");
  return 33;
}

// Cartões de indicadores lado a lado
export function cartoes(doc, y, indicadores) {
  const W = doc.internal.pageSize.getWidth();
  const gap = 4;
  const n = indicadores.length;
  const largura = (W - 24 - gap * (n - 1)) / n;
  indicadores.forEach((k, i) => {
    const x = 12 + i * (largura + gap);
    doc.setFillColor(...COR.fundo); doc.setDrawColor(...COR.borda);
    doc.roundedRect(x, y, largura, 22, 2.5, 2.5, "FD");
    doc.setFillColor(...COR.azul); doc.roundedRect(x, y + 3, 1.2, 16, 0.6, 0.6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.8); doc.setTextColor(...COR.cinza);
    doc.text(String(k.rotulo).toUpperCase(), x + 4.5, y + 6.5);
    doc.setFontSize(12.5); doc.setTextColor(...(k.cor || COR.navy));
    doc.text(String(k.valor), x + 4.5, y + 14);
    if (k.sub) { doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...COR.cinza); doc.text(String(k.sub), x + 4.5, y + 19); }
  });
  return y + 28;
}

// Título de seção com marca azul
export function secao(doc, y, titulo) {
  doc.setFillColor(...COR.azul); doc.roundedRect(12, y - 3, 2.4, 3.6, 0.5, 0.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...COR.navy);
  doc.text(titulo.toUpperCase(), 17, y);
  return y + 4;
}

// Tabela padronizada (cabeçalho azul, linhas alternadas, linha de total)
export function tabela(doc, autoTable, { y, head, body, foot, colunas = {}, fonte = 7.5 }) {
  autoTable(doc, {
    startY: y,
    margin: { left: 12, right: 12, bottom: 16 },
    head: [head],
    body,
    foot: foot ? [foot] : undefined,
    theme: "grid",
    styles: { font: "helvetica", fontSize: fonte, cellPadding: 1.8, textColor: COR.texto, lineColor: COR.borda, lineWidth: 0.1, valign: "middle" },
    headStyles: { fillColor: COR.azul, textColor: 255, fontStyle: "bold", fontSize: fonte - 0.3, halign: "left" },
    alternateRowStyles: { fillColor: COR.fundo },
    footStyles: { fillColor: COR.azulClaro, textColor: COR.navy, fontStyle: "bold" },
    columnStyles: colunas,
  });
  return doc.lastAutoTable.finalY + 6;
}

// Rodapé em todas as páginas: texto à esquerda e paginação à direita
export function rodape(doc, texto) {
  const total = doc.internal.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COR.borda); doc.setLineWidth(0.2);
    doc.line(12, H - 10, W - 12, H - 10);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...COR.cinza);
    doc.text(texto, 12, H - 6);
    doc.text(`Página ${i} de ${total}`, W - 12, H - 6, { align: "right" });
  }
}

/** Perfis com acesso aos dados financeiros (compra, custos, juros, capital, margem e resultado). */
export const PAPEIS_FINANCEIROS = ["admin_master", "proprietario", "gerente"];
export const podeFinanceiro = (papel) => PAPEIS_FINANCEIROS.includes(papel);
/** Linha de emissão: quem gerou o relatório e quando. */
export const emitidoPor = (perfil) => `Emitido por ${perfil?.nome || perfil?.papel || "usuário"} em ${new Date().toLocaleString("pt-BR")}`;
/** CPF mascarado para quem não tem acesso completo aos dados pessoais. */
export const mascararCpf = (c) => { const d = String(c || "").replace(/\D/g, ""); return d.length === 11 ? `***.***.***-${d.slice(9)}` : "—"; };

