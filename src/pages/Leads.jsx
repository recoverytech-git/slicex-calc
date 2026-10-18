import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Search, Trash2, Eye, FileDown, FileSpreadsheet, Image as ImageIcon } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useRascunho } from "../lib/rascunho";
import { gerarPdf, gerarPngBlob, linhaExcel, nomeArquivo, baixar } from "../lib/ficha";
import { formatarCPF, formatarTelefone, soDigitos } from "../lib/mascaras";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" };
const botao = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer" };

export default function Leads() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const [busca, setBusca] = useRascunho("leads.busca", "");
  const [selecao, setSelecao] = useRascunho("leads.selecao", []);
  const [leads, setLeads] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null);
  const souAdmin = perfil?.papel === "admin_master";

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await supabase.from("leads").select("*").order("criado_em", { ascending: false });
    setCarregando(false);
    if (error) { setMsg({ tipo: "erro", texto: error.message }); return; }
    setLeads(data ?? []);
  };
  useEffect(() => { if (supabaseConfigurado) carregar(); }, []);

  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const digitos = soDigitos(busca);
    if (!b) return leads;
    return leads.filter((l) => (l.nome || "").toLowerCase().includes(b) || (digitos && soDigitos(l.cpf).includes(digitos)));
  }, [leads, busca]);

  // Exporta os selecionados; sem seleção, exporta tudo que está na lista
  const alvo = () => (selecao.length ? leads.filter((l) => selecao.includes(l.id)) : filtrados);

  const alternar = (id) => setSelecao(selecao.includes(id) ? selecao.filter((x) => x !== id) : [...selecao, id]);
  const todosMarcados = filtrados.length > 0 && filtrados.every((l) => selecao.includes(l.id));
  const alternarTodos = () => setSelecao(todosMarcados ? selecao.filter((id) => !filtrados.some((l) => l.id === id)) : [...new Set([...selecao, ...filtrados.map((l) => l.id)])]);

  const exportarPdf = async () => {
    const lista = alvo();
    if (!lista.length) return;
    setOcupado(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      gerarPdf(lista, jsPDF, autoTable).save(lista.length === 1 ? nomeArquivo(lista[0], "pdf") : "fichas-leads.pdf");
    } finally { setOcupado(false); }
  };

  const exportarPng = async () => {
    setOcupado(true);
    try {
      for (const l of alvo()) {
        const blob = await gerarPngBlob(l);
        baixar(URL.createObjectURL(blob), nomeArquivo(l, "png"));
        await new Promise((r) => setTimeout(r, 250));
      }
    } finally { setOcupado(false); }
  };

  const exportarExcel = async () => {
    const lista = alvo();
    if (!lista.length) return;
    setOcupado(true);
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(lista.map(linhaExcel));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      baixar(URL.createObjectURL(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })), "leads.xlsx");
    } finally { setOcupado(false); }
  };

  const excluirSelecionados = async () => {
    if (!selecao.length) return;
    if (!window.confirm(`Excluir ${selecao.length} ficha(s)? Esta ação não pode ser desfeita.`)) return;
    setOcupado(true);
    const { error } = await supabase.from("leads").delete().in("id", selecao);
    setOcupado(false);
    if (error) { setMsg({ tipo: "erro", texto: `Não excluído: ${error.message}` }); return; }
    setSelecao([]);
    setMsg({ tipo: "ok", texto: "Fichas excluídas." });
    carregar();
  };

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Leads" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 6px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <ClipboardList size={22} /> Leads
          </h1>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-dim)" }}>
            Fichas financeiras salvas. Busque por nome ou CPF, selecione uma, algumas ou todas e exporte.
          </p>

          {msg && <div role="status" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msg.texto}</div>}

          <div style={{ ...card, padding: 16, marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Field label="Buscar por nome ou CPF" val={busca} set={setBusca} hint="Ex: Maria ou 123.456.789-00" />
            </div>
            <span style={{ fontSize: 12, color: "var(--text-mute)", paddingBottom: 12 }}>
              {selecao.length ? `${selecao.length} selecionado(s)` : `${filtrados.length} ficha(s)`}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={exportarPdf} disabled={ocupado} style={botao}><FileDown size={14} /> PDF</button>
            <button onClick={exportarPng} disabled={ocupado} style={botao}><ImageIcon size={14} /> PNG</button>
            <button onClick={exportarExcel} disabled={ocupado} style={botao}><FileSpreadsheet size={14} /> Excel</button>
            {souAdmin && (
              <button onClick={excluirSelecionados} disabled={ocupado || !selecao.length} style={{ ...botao, opacity: selecao.length ? 1 : 0.5 }}>
                <Trash2 size={14} /> Excluir selecionados
              </button>
            )}
            {ocupado && <span style={{ fontSize: 12, color: "var(--text-mute)", alignSelf: "center" }}>Preparando…</span>}
          </div>

          <div style={{ ...card, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)", color: "var(--text-dim)", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", width: 40 }}>
                    <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} aria-label="Selecionar todos" />
                  </th>
                  <th style={{ padding: "10px 12px" }}>Nome</th>
                  <th style={{ padding: "10px 12px" }}>CPF</th>
                  <th style={{ padding: "10px 12px" }}>Telefone</th>
                  <th style={{ padding: "10px 12px" }}>Data</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Ficha</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((l) => (
                  <tr key={l.id} style={{ borderTop: "1px solid var(--border)", background: selecao.includes(l.id) ? "rgba(68,147,248,0.08)" : "transparent" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <input type="checkbox" checked={selecao.includes(l.id)} onChange={() => alternar(l.id)} aria-label={`Selecionar ${l.nome}`} />
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text)", fontWeight: 600 }}>{l.nome}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-dim)" }}>{l.cpf ? formatarCPF(l.cpf) : "—"}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-dim)" }}>{l.telefone ? formatarTelefone(l.telefone) : "—"}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-mute)" }}>{new Date(l.criado_em).toLocaleDateString("pt-BR")}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <button onClick={() => navigate(`/leads/${l.id}`)} style={botao}><Eye size={14} /> Ver ficha</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!carregando && filtrados.length === 0 && (
              <p style={{ margin: 0, padding: 20, fontSize: 13, color: "var(--text-mute)" }}>Nenhuma ficha encontrada.</p>
            )}
            {carregando && <div className="skeleton" style={{ height: 120, margin: 16 }} />}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
