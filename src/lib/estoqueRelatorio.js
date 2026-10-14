/** Relatório PDF do estoque (paisagem). Recebe jsPDF e autoTable já carregados (import dinâmico). */
export function buildEstoquePDF({ jsPDF, autoTable, itens, rotulos }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const fmt = (v) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 297, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SliceX.calc · Estoque de veículos", 14, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} · ${itens.length} veículo(s)`, 14, 17);

  autoTable(doc, {
    startY: 28,
    margin: { left: 14, right: 14 },
    head: [["Modelo", "Placa", "Ano", "KM", "Status", "Preço pretendido"]],
    body: itens.map((v) => [
      v.modelo,
      v.placa ?? "—",
      v.ano_modelo ?? "—",
      v.quilometragem != null ? Number(v.quilometragem).toLocaleString("pt-BR") : "—",
      rotulos[v.status] ?? v.status,
      fmt(v.preco_venda_pretendido),
    ]),
    headStyles: { fillColor: [20, 20, 20], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  return doc;
}
