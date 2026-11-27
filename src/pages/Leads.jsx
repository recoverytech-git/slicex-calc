import logoPadrao from "../assets/logo.png";
import { carregarLogo } from "../lib/relatorioPdf";
// sem-rascunho: a busca e a selecao usam useRascunho; a pagina nao tem formulario de dados pessoais
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Search, Trash2, Eye, FileDown, FileSpreadsheet, Image as ImageIcon, Users, CheckCircle2, Clock, ListChecks } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import DbCabeca from "../components/DbCabeca";
import { DB_CSS } from "../components/dbEstilos";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useRascunho } from "../lib/rascunho";
import { gerarPdf, gerarPngBlob, linhaExcel, nomeArquivo, baixar } from "../lib/ficha";
import { formatarCPF, formatarTelefone, soDigitos } from "../lib/mascaras";

const STATUS_LEAD = { preenchida: "Preenchida pelo cliente", completa: "Completa" };

const LD_CSS = `
.ld-search{position:relative}
.ld-search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#64748b;pointer-events:none}
.ld-search .db-input{padding-left:42px;height:46px}
.ld-acoes{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.ld-danger{color:#b91c1c;border-color:#fecaca}
.ld-danger:hover{background:#fef2f2}
.ld-danger:disabled{opacity:.45;cursor:not-allowed}
.ld-check{width:17px;height:17px;accent-color:#2563eb;cursor:pointer}
.ld-row{transition:background .2s}
.ld-row td{transition:background .2s}
.ld-row:hover td{background:#f8fafc}
.ld-row.sel td{background:#eff6ff}
.ld-enter{animation:ldIn .5s cubic-bezier(.16,1,.3,1) both}
@keyframes ldIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ld-lift{transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}
.ld-lift:hover{transform:translateY(-2px);box-shadow:0 1px 3px rgba(15,23,42,.04),0 18px 32px -12px rgba(15,23,42,.14)}
.ld-ver{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;font-size:12px;font-weight:700;color:#0f172a;cursor:pointer;transition:all .2s}
.ld-ver:hover{border-color:#2563eb;color:#2563eb;box-shadow:0 6px 14px -6px rgba(37,99,235,.35)}
.ld-empty{text-align:center;padding:40px 16px;color:#64748b;font-size:14px}
.ld-tabela{overflow-x:auto}
.ld-tabela table{min-width:720px}
.ld-cpf{font-variant-numeric:tabular-nums;color:#475569}
.ld-nome{font-weight:700;color:var(--text)}
@media (max-width:639px){.ld-hide-sm{display:none}.ld-tabela table{min-width:0}}
`;

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

  const completas = leads.filter((l) => l.status !== "preenchida").length;
  const preenchidas = leads.length - completas;

  // Exporta os selecionados; sem selecao, exporta tudo que esta na lista
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
      gerarPdf(lista, jsPDF, autoTable, await carregarLogo(logoPadrao)).save(lista.length === 1 ? nomeArquivo(lista[0], "pdf") : "fichas-leads.pdf");
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

  const indicador = (rot, valor, Icone, sub) => (
    <div className="db-kpi ld-lift">
      <div className="db-kpi-top"><span className="db-kpi-l">{rot}</span><span className="db-kpi-ic"><Icone size={16} /></span></div>
      <div className="db-kpi-v">{valor}</div>
      {sub && <div className="db-kpi-s">{sub}</div>}
    </div>
  );

  return (
    <PageTransition>
      <div className="page-bg">
        <style>{DB_CSS + LD_CSS}</style>
        <Header subtitle="Leads" />
        <main className="db-wrap">
          <BackLink />
          <header className="db-head">
            <div>
              <div className="db-eyebrow">Captação de clientes</div>
              <h1 className="db-title"><ClipboardList size={24} /> Leads</h1>
              <p className="db-sub">Fichas financeiras salvas. Busque por nome ou CPF, selecione uma, algumas ou todas e exporte.</p>
            </div>
          </header>

          {msg && (
            <div role="status" className="db-card" style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: msg.tipo === "ok" ? "#059669" : "#b91c1c" }}>{msg.texto}</div>
          )}

          <div className="db-kgrid">
            {indicador("Fichas salvas", leads.length, Users, "total de leads")}
            {indicador("Completas", completas, CheckCircle2, "preenchidas e revisadas")}
            {indicador("Aguardando revisão", preenchidas, Clock, "preenchidas pelo cliente")}
            {indicador("Selecionadas", selecao.length, ListChecks, selecao.length ? "para exportar ou excluir" : "nenhuma selecionada")}
          </div>

          <section className="db-card">
            <DbCabeca Icone={Search} titulo="Buscar e exportar" sub={selecao.length ? `${selecao.length} selecionado(s)` : `${filtrados.length} ficha(s) na lista`} />
            <div className="ld-search" style={{ marginBottom: 14 }}>
              <Search size={18} />
              <input className="db-input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: Maria ou 123.456.789-00" aria-label="Buscar por nome ou CPF" />
            </div>
            <div className="ld-acoes">
              <button type="button" className="db-btn-sec" onClick={exportarPdf} disabled={ocupado}><FileDown size={15} /> PDF</button>
              <button type="button" className="db-btn-sec" onClick={exportarPng} disabled={ocupado}><ImageIcon size={15} /> PNG</button>
              <button type="button" className="db-btn-sec" onClick={exportarExcel} disabled={ocupado}><FileSpreadsheet size={15} /> Excel</button>
              {souAdmin && (
                <button type="button" className="db-btn-sec ld-danger" onClick={excluirSelecionados} disabled={ocupado || !selecao.length}>
                  <Trash2 size={15} /> Excluir selecionados
                </button>
              )}
              {ocupado && <span style={{ fontSize: 12, color: "var(--text-mute)", marginLeft: 4 }}>Preparando…</span>}
            </div>
          </section>

          <section className="db-card">
            <DbCabeca Icone={ClipboardList} titulo="Fichas financeiras" sub="Clique em Ver ficha para abrir o cadastro completo" />
            {carregando && <div className="skeleton" style={{ height: 140, borderRadius: 14 }} />}
            {!carregando && filtrados.length === 0 && <div className="ld-empty">Nenhuma ficha encontrada.</div>}
            {!carregando && filtrados.length > 0 && (
              <div className="ld-tabela">
                <table className="db-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>
                        <input type="checkbox" className="ld-check" checked={todosMarcados} onChange={alternarTodos} aria-label="Selecionar todos" />
                      </th>
                      <th>Nome</th>
                      <th className="ld-hide-sm">CPF</th>
                      <th className="ld-hide-sm">Telefone</th>
                      <th>Status</th>
                      <th className="ld-hide-sm">Data</th>
                      <th className="db-r">Ficha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((l, i) => {
                      const marcado = selecao.includes(l.id);
                      return (
                        <tr key={l.id} className={`ld-row ld-enter ${marcado ? "sel" : ""}`} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                          <td>
                            <input type="checkbox" className="ld-check" checked={marcado} onChange={() => alternar(l.id)} aria-label={`Selecionar ${l.nome}`} />
                          </td>
                          <td className="ld-nome">{l.nome}</td>
                          <td className="ld-cpf ld-hide-sm">{l.cpf ? formatarCPF(l.cpf) : "—"}</td>
                          <td className="ld-cpf ld-hide-sm">{l.telefone ? formatarTelefone(l.telefone) : "—"}</td>
                          <td>
                            <span className={`db-pill ${l.status === "preenchida" ? "db-pill-azul" : "db-pill-verde"}`}>{STATUS_LEAD[l.status] ?? "Completa"}</span>
                          </td>
                          <td className="ld-hide-sm" style={{ color: "var(--text-mute)" }}>{new Date(l.criado_em).toLocaleDateString("pt-BR")}</td>
                          <td className="db-r">
                            <button type="button" className="ld-ver" onClick={() => navigate(`/leads/${l.id}`)}><Eye size={14} /> Ver ficha</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </PageTransition>
  );
}
