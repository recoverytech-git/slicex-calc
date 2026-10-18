import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Plus, Download, Share2, X, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import Field from "../components/Field";
import MoneyField from "../components/MoneyField";
import PrimaryButton from "../components/PrimaryButton";
import Modal from "../components/Modal";
import ChecklistVeiculo from "../components/ChecklistVeiculo";
import VendaVeiculo from "../components/VendaVeiculo";
import UploadFotos from "../components/UploadFotos";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useRascunho } from "../lib/rascunho";
import { formatarBRL } from "../lib/moeda";
import { BUCKET_FOTOS } from "../lib/fotos";
import { normalizar, excluirVeiculo } from "../lib/estoque";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: 20, marginTop: 14 };
const STATUS = [["em_preparacao", "Em preparação"], ["disponivel", "Disponível"], ["reservado", "Reservado"], ["vendido", "Vendido"], ["retirado", "Retirado"]];
const ROTULO = Object.fromEntries(STATUS);
const TIPO = { capital_proprio: "Capital próprio", financiamento: "Financiamento" };
const titulo = { margin: "0 0 12px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const moeda = (v) => (v == null ? "—" : formatarBRL(Number(v)));
const botaoSec = { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "6px 12px", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" };
const botaoViewer = { ...botaoSec, color: "#ffffff", borderColor: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)" };
const botaoIcone = { width: 28, height: 28, borderRadius: 999, background: "rgba(0,0,0,0.7)", border: "1px solid var(--border-strong)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const navFoto = (lado) => ({ position: "absolute", top: "50%", [lado]: 8, transform: "translateY(-50%)", ...botaoIcone, width: 40, height: 40 });

function Linha({ label, valor, destaque }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--text-mute)" }}>{label}</span>
      <span style={{ color: destaque ?? "var(--text)", fontWeight: 600, textAlign: "right" }}>{valor ?? "—"}</span>
    </div>
  );
}

function Secao({ n, nome, children }) {
  return (
    <div style={card}>
      <p style={titulo}>{n}. {nome}</p>
      {children}
    </div>
  );
}

export default function VeiculoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { perfil, sessao } = useAuth();
  const papel = perfil?.papel;
  const gestao = ["admin_master", "proprietario", "gerente"].includes(papel);
  const podeEditar = gestao;
  const podeVender = ["admin_master", "proprietario"].includes(papel);
  const podeExcluir = ["admin_master", "proprietario"].includes(papel);

  const [veiculo, setVeiculo] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [custos, setCustos] = useState([]);
  const [financiamento, setFinanciamento] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [erro, setErro] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useRascunho("det.form", {});
  const [novoCusto, setNovoCusto] = useRascunho("det.novoCusto", { descricao: "", valor: 0 });
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [editandoCustos, setEditandoCustos] = useState(false);
  const [editandoFotos, setEditandoFotos] = useState(false);
  const [fotoAtiva, setFotoAtiva] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msgFoto, setMsgFoto] = useState(null);

  const excluirCusto = async (c) => {
    if (!window.confirm(`Excluir o custo "${c.descricao}"?`)) return;
    const { error } = await supabase.from("veiculo_custos").delete().eq("id", c.id);
    if (error) setMsg({ tipo: "erro", texto: `Custo não excluído: ${error.message}` });
    else { setMsg({ tipo: "ok", texto: "Custo excluído." }); carregar(); }
  };

  const nomeArquivo = (i) => `${(veiculo?.modelo || "veiculo").toLowerCase().replace(/\s+/g, "-")}-${i + 1}.jpg`;

  const baixarUma = async (i) => {
    const r = await fetch(fotos[i].url);
    const b = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = nomeArquivo(i);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const baixarTodas = async () => {
    setBusy(true);
    setMsgFoto(null);
    try {
      for (let i = 0; i < fotos.length; i++) {
        await baixarUma(i);
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (e) {
      setMsgFoto({ tipo: "erro", texto: `Download interrompido: ${e.message}` });
    } finally { setBusy(false); }
  };

  const compartilhar = async (indices, titulo) => {
    setBusy(true);
    setMsgFoto(null);
    try {
      const files = await Promise.all(indices.map(async (i) => {
        const r = await fetch(fotos[i].url);
        const b = await r.blob();
        return new File([b], nomeArquivo(i), { type: b.type || "image/jpeg" });
      }));
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: titulo });
      } else {
        setMsgFoto({ tipo: "erro", texto: "Este navegador não compartilha arquivos. As fotos serão baixadas." });
        for (const i of indices) await baixarUma(i);
      }
    } catch (e) {
      if (e?.name !== "AbortError") setMsgFoto({ tipo: "erro", texto: `Não foi possível compartilhar: ${e.message}` });
    } finally { setBusy(false); }
  };

  const excluirFoto = async (f) => {
    if (!window.confirm("Excluir esta foto? Esta ação não pode ser desfeita.")) return;
    setBusy(true);
    setMsgFoto(null);
    try {
      const { error: eStorage } = await supabase.storage.from(BUCKET_FOTOS).remove([f.caminho_storage]);
      if (eStorage) throw eStorage;
      const { error: eRow } = await supabase.from("veiculo_fotos").delete().eq("id", f.id);
      if (eRow) throw eRow;
      setFotoAtiva(null);
      setMsgFoto({ tipo: "ok", texto: "Foto excluída." });
      carregar();
    } catch (e) {
      setMsgFoto({ tipo: "erro", texto: `Foto não excluída: ${e.message}` });
    } finally { setBusy(false); }
  };

  const carregar = async () => {
    const tabela = papel === "vendedor" ? "v_veiculos_vendedor" : "veiculos";
    const { data, error } = await supabase.from(tabela).select("*").eq("id", id).maybeSingle();
    if (error) { setErro(error.message); return; }
    if (!data) { setErro("Veículo não encontrado."); return; }
    setVeiculo(data);

    const { data: fs } = await supabase.from("veiculo_fotos").select("id, caminho_storage, ordem_exibicao").eq("veiculo_id", id).order("ordem_exibicao");
    setFotos(await Promise.all((fs ?? []).map(async (f) => {
      const { data: s } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrl(f.caminho_storage, 3600);
      return { ...f, url: s?.signedUrl ?? null };
    })));

    if (gestao) {
      const [c, fin, v] = await Promise.all([
        supabase.from("veiculo_custos").select("id, descricao, valor").eq("veiculo_id", id).order("criado_em"),
        supabase.from("veiculo_financiamentos").select("*").eq("veiculo_id", id).maybeSingle(),
        supabase.from("veiculo_vendas").select("id, data_venda, valor_venda, despesas_venda, descontos").eq("veiculo_id", id).order("data_venda", { ascending: false }),
      ]);
      setCustos(c.data ?? []);
      setFinanciamento(fin.data ?? null);
      setVendas(v.data ?? []);
    }
  };

  useEffect(() => {
    if (supabaseConfigurado && papel) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, papel]);

  const abrirEdicao = () => {
    setForm({
      marca: veiculo.marca ?? "", modelo: veiculo.modelo ?? "", placa: veiculo.placa ?? "", renavam: veiculo.renavam ?? "", chassi: veiculo.chassi ?? "",
      ano_fabricacao: veiculo.ano_fabricacao ?? "", ano_modelo: veiculo.ano_modelo ?? "", cor: veiculo.cor ?? "",
      quilometragem: veiculo.quilometragem ?? "", combustivel: veiculo.combustivel ?? "", cambio: veiculo.cambio ?? "",
      preco_compra: Number(veiculo.preco_compra ?? 0), valor_fipe: Number(veiculo.valor_fipe ?? 0),
      preco_venda_pretendido: Number(veiculo.preco_venda_pretendido ?? 0),
    });
    setEditando(true);
  };

  const salvarEdicao = async () => {
    setMsg(null);
    if (!form.modelo?.trim()) { setMsg({ tipo: "erro", texto: "O modelo é obrigatório." }); return; }
    const payload = {
      marca: form.marca?.trim() || null,
      modelo: form.modelo.trim(),
      placa: form.placa ? normalizar(form.placa) : null,
      renavam: form.renavam ? normalizar(form.renavam) : null,
      chassi: form.chassi ? normalizar(form.chassi) : null,
      ano_fabricacao: form.ano_fabricacao ? parseInt(form.ano_fabricacao, 10) : null,
      ano_modelo: form.ano_modelo ? parseInt(form.ano_modelo, 10) : null,
      cor: form.cor || null,
      quilometragem: form.quilometragem ? parseInt(form.quilometragem, 10) : null,
      combustivel: form.combustivel || null,
      cambio: form.cambio || null,
      preco_compra: form.preco_compra || null,
      valor_fipe: form.valor_fipe || null,
      preco_venda_pretendido: form.preco_venda_pretendido || null,
    };
    const { error } = await supabase.from("veiculos").update(payload).eq("id", id);
    if (error) { setMsg({ tipo: "erro", texto: `Não foi salvo: ${error.message}` }); return; }
    setEditando(false);
    setMsg({ tipo: "ok", texto: "Dados atualizados." });
    carregar();
  };

  const adicionarCusto = async () => {
    setMsg(null);
    const valor = Number(novoCusto.valor);
    if (!novoCusto.descricao?.trim() || !(valor > 0)) { setMsg({ tipo: "erro", texto: "Informe a descrição e o valor do custo." }); return; }
    const { error } = await supabase.from("veiculo_custos").insert({
      veiculo_id: id, descricao: novoCusto.descricao.trim(), valor, criado_por: sessao?.user?.id,
    });
    if (error) { setMsg({ tipo: "erro", texto: `Custo não adicionado: ${error.message}` }); return; }
    setNovoCusto({ descricao: "", valor: 0 });
    setMsg({ tipo: "ok", texto: "Custo adicionado." });
    carregar();
  };

  const mudarStatus = async (status) => {
    setMsg(null);
    const { error } = await supabase.from("veiculos").update({ status }).eq("id", id);
    if (error) setMsg({ tipo: "erro", texto: `Status não alterado: ${error.message}` });
    else { setMsg({ tipo: "ok", texto: "Status atualizado." }); carregar(); }
  };

  const excluir = async () => {
    const { error } = await excluirVeiculo(id);
    if (error) { setMsg({ tipo: "erro", texto: `Não foi excluído: ${error.message}` }); setConfirmarExclusao(false); return; }
    navigate("/estoque", { replace: true });
  };

  // Matemática da margem (mantida como estava)
  const compra = Number(veiculo?.preco_compra ?? 0);
  const fipe = Number(veiculo?.valor_fipe ?? 0);
  const diferenca = veiculo?.valor_fipe && veiculo?.preco_compra ? fipe - compra : null;
  const diferencaPct = diferenca != null && fipe ? (diferenca / fipe) * 100 : null;
  const totalCustos = custos.reduce((s, c) => s + Number(c.valor ?? 0), 0);
  const totalJuros = financiamento ? Number(financiamento.total_juros ?? 0) : 0;
  const investimento = compra + totalCustos + totalJuros;
  const vendaAtual = vendas[0];
  const resultadoParcial = veiculo?.preco_venda_pretendido != null && veiculo?.preco_compra != null
    ? Number(veiculo.preco_venda_pretendido) - investimento : null;
  const resultadoFinal = vendaAtual
    ? Number(vendaAtual.valor_venda) - Number(vendaAtual.despesas_venda ?? 0) - Number(vendaAtual.descontos ?? 0) - investimento
    : null;
  const percentual = (r) => (r != null && investimento > 0 ? (r / investimento) * 100 : null);
  const pctTexto = (p) => (p == null ? "—" : `${p.toFixed(2)}%`);
  const corResultado = (r) => (r == null ? undefined : r >= 0 ? "var(--text)" : "var(--text-dim)");

  const campo = (rotulo, chave, extra = {}) => (
    <Field label={rotulo} val={form[chave] ?? ""} set={(v) => setForm({ ...form, [chave]: v })} {...extra} />
  );
  const dinheiro = (rotulo, chave) => (
    <MoneyField label={rotulo} valor={form[chave] ?? 0} onChange={(n) => setForm({ ...form, [chave]: n })} />
  );

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Detalhes do veículo" />
        <div className="container" style={{ paddingTop: 8 }}>
          <BackLink />
          {erro && <p style={{ color: "var(--text-dim)", marginTop: 22 }}>{erro}</p>}
          {!erro && !veiculo && <p style={{ color: "var(--text-mute)", marginTop: 22 }}>Carregando…</p>}

          {veiculo && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: "22px 0 4px", color: "var(--text)" }}>{veiculo.modelo}</h1>
              <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 4px" }}>
                {gestao && veiculo.placa ? `Placa ${veiculo.placa} · ` : ""}{ROTULO[veiculo.status] ?? veiculo.status}
              </p>
              {msg && <div role="status" style={{ ...card, marginTop: 12, padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{msg.texto}</div>}

              {/* 1. Identificação e características */}
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p style={{ ...titulo, margin: 0 }}>1. Identificação e características</p>
                  {podeEditar && !editando && (
                    <button onClick={abrirEdicao} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "6px 12px", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Pencil size={13} /> Editar
                    </button>
                  )}
                </div>

                {editando ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="grid-4">
                      {campo("Marca", "marca")}
                      {campo("Modelo", "modelo")}
                      {campo("Placa", "placa")}
                      {campo("RENAVAM", "renavam")}
                      {campo("Chassi", "chassi")}
                    </div>
                    <div className="grid-4">
                      {campo("Ano de fabricação", "ano_fabricacao")}
                      {campo("Ano do modelo", "ano_modelo")}
                      {campo("Cor", "cor")}
                      {campo("Quilometragem (km)", "quilometragem")}
                    </div>
                    <div className="grid-2">
                      {campo("Combustível", "combustivel")}
                      {campo("Câmbio", "cambio")}
                    </div>
                    <div className="grid-3">
                      {dinheiro("Valor de compra", "preco_compra")}
                      {dinheiro("Valor FIPE", "valor_fipe")}
                      {dinheiro("Valor de venda pretendido", "preco_venda_pretendido")}
                    </div>
                    <div className="grid-2">
                      <PrimaryButton onClick={() => setEditando(false)} style={{ background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border-strong)" }}>Cancelar</PrimaryButton>
                      <PrimaryButton onClick={salvarEdicao}>Salvar alterações</PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <>
                    {gestao && <Linha label="Placa" valor={veiculo.placa} />}
                    {gestao && <Linha label="RENAVAM" valor={veiculo.renavam} />}
                    {gestao && <Linha label="Chassi" valor={veiculo.chassi} />}
                    <Linha label="Marca" valor={veiculo.marca} />
                    <Linha label="Ano de fabricação" valor={veiculo.ano_fabricacao} />
                    <Linha label="Ano do modelo" valor={veiculo.ano_modelo} />
                    <Linha label="Quilometragem" valor={veiculo.quilometragem != null ? `${Number(veiculo.quilometragem).toLocaleString("pt-BR")} km` : null} />
                    {gestao && <Linha label="Cor" valor={veiculo.cor} />}
                    {gestao && <Linha label="Combustível" valor={veiculo.combustivel} />}
                    {gestao && <Linha label="Câmbio" valor={veiculo.cambio} />}
                    <Linha label="Valor de venda pretendido" valor={moeda(veiculo.preco_venda_pretendido)} />
                  </>
                )}
              </div>

              {gestao && !editando && (
                <>
                  {/* 2. Análise FIPE x Compra */}
                  <Secao n={2} nome="Análise FIPE x Compra">
                    <Linha label="Valor FIPE" valor={moeda(veiculo.valor_fipe)} />
                    <Linha label="Valor de compra" valor={moeda(veiculo.preco_compra)} />
                    <Linha label="Diferença em reais" valor={diferenca != null ? formatarBRL(diferenca) : null} />
                    <Linha label="Diferença percentual" valor={diferencaPct != null ? `${diferencaPct.toFixed(2)}%` : null} />
                  </Secao>

                  {/* 3. Origem do capital */}
                  <Secao n={3} nome="Origem do capital">
                    <Linha label="Origem do capital" valor={TIPO[veiculo.tipo_aquisicao] ?? null} />
                    {financiamento && (
                      <>
                        <Linha label="Modo de financiamento" valor={financiamento.sistema_amortizacao?.toLowerCase() === "sac" ? "SAC" : "PRICE"} />
                        <Linha label="Valor financiado" valor={moeda(financiamento.valor_financiado)} />
                        <Linha label="Taxa de juros" valor={`${financiamento.taxa_juros_percentual}% ${financiamento.periodicidade_taxa ?? "mensal"}`} />
                        <Linha label="Prazo" valor={`${financiamento.quantidade_parcelas} parcelas`} />
                        <Linha label="Valor da parcela" valor={moeda(financiamento.valor_parcela)} />
                        <Linha label="Total de juros" valor={moeda(financiamento.total_juros)} />
                      </>
                    )}
                  </Secao>

                  {/* 4. Custos adicionais */}
                  <div style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                      <p style={{ ...titulo, margin: 0 }}>4. Custos adicionais</p>
                      {podeEditar && (
                        <button onClick={() => setEditandoCustos((v) => !v)} style={botaoSec}>
                          <Pencil size={13} /> {editandoCustos ? "Concluir" : "Editar"}
                        </button>
                      )}
                    </div>
                    {custos.length === 0 && <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-mute)" }}>Nenhum custo adicional.</p>}
                    {custos.map((c) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", padding: "8px 0", fontSize: 13 }}>
                        <span style={{ flex: 1, color: "var(--text-mute)" }}>{c.descricao}</span>
                        <span style={{ color: "var(--text)", fontWeight: 600 }}>{moeda(c.valor)}</span>
                        {podeEditar && editandoCustos && (
                          <button onClick={() => excluirCusto(c)} aria-label="Excluir custo" style={{ ...botaoIcone, color: "var(--text)" }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                    <Linha label="Total de custos adicionais" valor={formatarBRL(totalCustos)} />
                    {podeEditar && editandoCustos && (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                        <Field label="Descrição do custo" val={novoCusto.descricao} set={(v) => setNovoCusto({ ...novoCusto, descricao: v })} hint="Ex: Documentação, pneus…" />
                        <MoneyField label="Valor do custo" valor={novoCusto.valor} onChange={(n) => setNovoCusto({ ...novoCusto, valor: n })} />
                        <PrimaryButton onClick={adicionarCusto} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Plus size={15} /> Adicionar custo
                        </PrimaryButton>
                      </div>
                    )}
                  </div>

                  {/* 5. Resultado da operação */}
                  <Secao n={5} nome="Resultado da operação">
                    <Linha label="Investimento total" valor={formatarBRL(investimento)} />
                    <Linha label="Resultado parcial (venda pretendida)" valor={`${moeda(resultadoParcial)} · ${pctTexto(percentual(resultadoParcial))}`} destaque={corResultado(resultadoParcial)} />
                  </Secao>

                  {/* 6. Resultado final (após a venda) */}
                  {vendaAtual && (
                    <Secao n={6} nome="Resultado final">
                      <Linha label="Valor de venda" valor={moeda(vendaAtual.valor_venda)} />
                      <Linha label="Despesas e descontos" valor={formatarBRL(Number(vendaAtual.despesas_venda ?? 0) + Number(vendaAtual.descontos ?? 0))} />
                      <Linha label="Resultado final do veículo" valor={`${moeda(resultadoFinal)} · ${pctTexto(percentual(resultadoFinal))}`} destaque={corResultado(resultadoFinal)} />
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-mute)" }}>
                        Resultado final = valor de venda − despesas − descontos − investimento total. O percentual é calculado sobre o investimento total.
                      </p>
                    </Secao>
                  )}
                </>
              )}

              <div style={card}>
                <p style={titulo}>Status</p>
                {podeEditar ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {STATUS.map(([v, rotulo]) => (
                      <button key={v} onClick={() => mudarStatus(v)}
                        style={{ padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          border: "1px solid var(--border-strong)",
                          background: veiculo.status === v ? "var(--surface-3)" : "transparent",
                          color: veiculo.status === v ? "var(--text)" : "var(--text-mute)" }}>
                        {rotulo}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text)" }}>{ROTULO[veiculo.status] ?? veiculo.status}</p>
                )}
              </div>

              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                  <p style={{ ...titulo, margin: 0 }}>Fotos ({fotos.length})</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {fotos.length > 0 && <button onClick={baixarTodas} disabled={busy} style={botaoSec}><Download size={13} /> Baixar todas</button>}
                    {fotos.length > 0 && <button onClick={() => compartilhar(fotos.map((_, i) => i), `${veiculo.modelo} — fotos`)} disabled={busy} style={botaoSec}><Share2 size={13} /> Compartilhar todas</button>}
                    {podeEditar && fotos.length > 0 && (
                      <button onClick={() => setEditandoFotos((v) => !v)} style={botaoSec}><Pencil size={13} /> {editandoFotos ? "Concluir" : "Editar"}</button>
                    )}
                  </div>
                </div>
                {busy && <p style={{ fontSize: 12, color: "var(--text-mute)", margin: "0 0 10px" }}>Preparando…</p>}
                {msgFoto && <div role="status" style={{ marginBottom: 10, padding: "8px 12px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text)" }}>{msgFoto.texto}</div>}
                {fotos.length === 0 && <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-mute)" }}>Nenhuma foto cadastrada.</p>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
                  {fotos.map((f, i) => f.url && (
                    <div key={f.id} style={{ position: "relative" }}>
                      <button onClick={() => setFotoAtiva(i)} aria-label={`Ver foto ${i + 1}`} style={{ padding: 0, border: "none", background: "none", cursor: "zoom-in", width: "100%", display: "block" }}>
                        <img src={f.url} alt={`Foto ${i + 1}`} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", display: "block", transition: "transform 0.25s ease" }} />
                      </button>
                      {editandoFotos && (
                        <button onClick={() => excluirFoto(f)} aria-label="Excluir foto" style={{ ...botaoIcone, position: "absolute", top: 6, right: 6 }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {podeEditar && <div style={{ marginTop: 14 }}><UploadFotos veiculoId={veiculo.id} jaExistentes={fotos.length} onEnviado={carregar} /></div>}
              </div>

              {gestao && (
                <div style={card}>
                  <ChecklistVeiculo veiculoId={veiculo.id} podeEditar={podeEditar} onSalvo={carregar} />
                </div>
              )}

              {podeVender && veiculo.status !== "vendido" && (
                <div style={card}>
                  <VendaVeiculo veiculoId={veiculo.id} />
                </div>
              )}

              {podeExcluir && (
                <div style={card}>
                  <p style={titulo}>Excluir veículo</p>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-mute)" }}>
                    Remove o veículo, seus custos, financiamento, fotos, checklist e vendas. Não pode ser desfeito.
                  </p>
                  <button onClick={() => setConfirmarExclusao(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "9px 14px", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <Trash2 size={14} /> Excluir veículo
                  </button>
                </div>
              )}

              {fotoAtiva !== null && fotos[fotoAtiva]?.url && (
                <div role="dialog" aria-label="Visualizar foto" onClick={() => setFotoAtiva(null)}
                  style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                  <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#ffffff", fontSize: 13 }}>
                      <span>{fotoAtiva + 1} de {fotos.length}</span>
                      <button onClick={() => setFotoAtiva(null)} aria-label="Fechar" style={botaoIcone}><X size={14} /></button>
                    </div>
                    <div style={{ position: "relative" }}>
                      <img src={fotos[fotoAtiva].url} alt="" style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "var(--r-md)", background: "#000", display: "block" }} />
                      {fotos.length > 1 && (
                        <>
                          <button onClick={() => setFotoAtiva((fotoAtiva - 1 + fotos.length) % fotos.length)} aria-label="Foto anterior" style={navFoto("left")}><ChevronLeft size={20} /></button>
                          <button onClick={() => setFotoAtiva((fotoAtiva + 1) % fotos.length)} aria-label="Próxima foto" style={navFoto("right")}><ChevronRight size={20} /></button>
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                      <button onClick={() => baixarUma(fotoAtiva)} disabled={busy} style={botaoViewer}><Download size={14} /> Baixar</button>
                      <button onClick={() => compartilhar([fotoAtiva], veiculo.modelo)} disabled={busy} style={botaoViewer}><Share2 size={14} /> Compartilhar</button>
                      {podeEditar && <button onClick={() => excluirFoto(fotos[fotoAtiva])} disabled={busy} style={botaoViewer}><Trash2 size={14} /> Excluir</button>}
                    </div>
                  </div>
                </div>
              )}

              <Modal open={confirmarExclusao} onClose={() => setConfirmarExclusao(false)} title="Excluir veículo"
                footer={<PrimaryButton onClick={excluir} style={{ width: "100%" }}>Excluir definitivamente</PrimaryButton>}>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text)" }}>
                  Tem certeza? Todos os dados e fotos de {veiculo.modelo} serão apagados.
                </p>
              </Modal>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
