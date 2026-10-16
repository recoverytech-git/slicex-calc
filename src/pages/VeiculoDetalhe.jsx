import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, Pencil } from "lucide-react";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import PageTransition from "../components/PageTransition";
import ChecklistVeiculo from "../components/ChecklistVeiculo";
import VendaVeiculo from "../components/VendaVeiculo";
import UploadFotos from "../components/UploadFotos";
import Field from "../components/Field";
import MoneyField from "../components/MoneyField";
import PrimaryButton from "../components/PrimaryButton";
import Modal from "../components/Modal";
import { supabase, supabaseConfigurado } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { formatarBRL } from "../lib/moeda";
import { BUCKET_FOTOS } from "../lib/fotos";
import { normalizar, excluirVeiculo } from "../lib/estoque";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: 20, marginTop: 14 };
const STATUS = [["em_preparacao", "Em preparação"], ["disponivel", "Disponível"], ["reservado", "Reservado"], ["vendido", "Vendido"], ["retirado", "Retirado"]];
const ROTULO = Object.fromEntries(STATUS);
const titulo = { margin: "0 0 12px", fontSize: 12, color: "var(--text-dim)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const TIPO = { capital_proprio: "Capital próprio", financiamento: "Financiamento" };
const moeda = (v) => (v == null ? "—" : formatarBRL(Number(v)));

function Linha({ label, valor, destaque }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--text-mute)" }}>{label}</span>
      <span style={{ color: destaque ?? "var(--text)", fontWeight: 600, textAlign: "right" }}>{valor ?? "—"}</span>
    </div>
  );
}

export default function VeiculoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const papel = perfil?.papel;
  const gestao = ["admin_master", "proprietario", "gerente"].includes(papel);
  const podeEditar = ["admin_master", "proprietario"].includes(papel);
  const [veiculo, setVeiculo] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [custos, setCustos] = useState([]);
  const [financiamento, setFinanciamento] = useState(null);
  const [erro, setErro] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

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
      const [{ data: vs }, { data: cs }, { data: fin }] = await Promise.all([
        supabase.from("veiculo_vendas").select("id, data_venda, valor_venda, despesas_venda, descontos").eq("veiculo_id", id).order("data_venda", { ascending: false }),
        supabase.from("veiculo_custos").select("id, descricao, valor, categoria").eq("veiculo_id", id).order("criado_em"),
        supabase.from("veiculo_financiamentos").select("*").eq("veiculo_id", id).maybeSingle(),
      ]);
      setVendas(vs ?? []);
      setCustos(cs ?? []);
      setFinanciamento(fin ?? null);
    }
  };

  useEffect(() => {
    if (supabaseConfigurado && papel) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, papel]);

  const abrirEdicao = () => {
    setForm({
      modelo: veiculo.modelo ?? "", placa: veiculo.placa ?? "", renavam: veiculo.renavam ?? "", chassi: veiculo.chassi ?? "",
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

  // Análise financeira (valores reais do banco)
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
              {msg && <div role="status" style={{ ...card, padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{msg.texto}</div>}

              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
                  <p style={{ ...titulo, margin: 0 }}>Identificação e características</p>
                  {podeEditar && !editando && (
                    <button onClick={abrirEdicao} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "6px 12px", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Pencil size={13} /> Editar dados
                    </button>
                  )}
                </div>
                {editando ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
                      <Field label="Modelo" val={form.modelo} set={(v) => setForm({ ...form, modelo: v })} />
                      <Field label="Placa" val={form.placa} set={(v) => setForm({ ...form, placa: v })} />
                      <Field label="RENAVAM" val={form.renavam} set={(v) => setForm({ ...form, renavam: v })} />
                      <Field label="Chassi" val={form.chassi} set={(v) => setForm({ ...form, chassi: v })} />
                      <Field label="Ano de fabricação" val={form.ano_fabricacao} set={(v) => setForm({ ...form, ano_fabricacao: v })} />
                      <Field label="Ano do modelo" val={form.ano_modelo} set={(v) => setForm({ ...form, ano_modelo: v })} />
                      <Field label="Cor" val={form.cor} set={(v) => setForm({ ...form, cor: v })} />
                      <Field label="Quilometragem (km)" val={form.quilometragem} set={(v) => setForm({ ...form, quilometragem: v })} />
                      <Field label="Combustível" val={form.combustivel} set={(v) => setForm({ ...form, combustivel: v })} />
                      <Field label="Câmbio" val={form.cambio} set={(v) => setForm({ ...form, cambio: v })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
                      <MoneyField label="Valor de compra" valor={form.preco_compra} onChange={(n) => setForm({ ...form, preco_compra: n })} />
                      <MoneyField label="Valor FIPE" valor={form.valor_fipe} onChange={(n) => setForm({ ...form, valor_fipe: n })} />
                      <MoneyField label="Valor de venda pretendido" valor={form.preco_venda_pretendido} onChange={(n) => setForm({ ...form, preco_venda_pretendido: n })} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <PrimaryButton onClick={() => setEditando(false)} style={{ flex: 1, background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border-strong)" }}>Cancelar</PrimaryButton>
                      <PrimaryButton onClick={salvarEdicao} style={{ flex: 1 }}>Salvar alterações</PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <>
                    {gestao && <Linha label="Placa" valor={veiculo.placa} />}
                    {gestao && <Linha label="RENAVAM" valor={veiculo.renavam} />}
                    {gestao && <Linha label="Chassi" valor={veiculo.chassi} />}
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
                <div style={card}>
                  <p style={titulo}>Análise FIPE x Compra e origem do capital</p>
                  <Linha label="Valor FIPE" valor={moeda(veiculo.valor_fipe)} />
                  <Linha label="Valor de compra" valor={moeda(veiculo.preco_compra)} />
                  <Linha label="Diferença em reais" valor={diferenca != null ? moeda(diferenca) : null} />
                  <Linha label="Diferença percentual" valor={pctTexto(diferencaPct)} />
                  <Linha label="Origem do capital" valor={TIPO[veiculo.tipo_aquisicao] ?? null} />
                  {financiamento && (
                    <>
                      <Linha label="Modo de financiamento" valor={financiamento.sistema_amortizacao} />
                      <Linha label="Valor financiado" valor={moeda(financiamento.valor_financiado)} />
                      <Linha label="Taxa de juros" valor={`${financiamento.taxa_juros_percentual}% ${financiamento.periodicidade_taxa ?? "mensal"}`} />
                      <Linha label="Prazo" valor={`${financiamento.quantidade_parcelas} parcelas`} />
                      <Linha label="Valor da parcela" valor={moeda(financiamento.valor_parcela)} />
                      <Linha label="Total de juros" valor={moeda(financiamento.total_juros)} />
                    </>
                  )}
                  <Linha label="Custos adicionais" valor={moeda(totalCustos)} />
                  {custos.map((c) => (
                    <Linha key={c.id} label={`· ${c.descricao}`} valor={moeda(c.valor)} />
                  ))}
                  <Linha label="Investimento total" valor={moeda(investimento)} />

                  <p style={{ ...titulo, marginTop: 18 }}>Resultado da operação</p>
                  <Linha label="Resultado parcial (venda pretendida)" valor={`${moeda(resultadoParcial)} · ${pctTexto(percentual(resultadoParcial))}`} destaque={corResultado(resultadoParcial)} />
                  {vendaAtual ? (
                    <>
                      <Linha label="Valor de venda final" valor={moeda(vendaAtual.valor_venda)} />
                      <Linha label="Despesas e descontos" valor={moeda(Number(vendaAtual.despesas_venda ?? 0) + Number(vendaAtual.descontos ?? 0))} />
                      <Linha label="Resultado final do veículo" valor={`${moeda(resultadoFinal)} · ${pctTexto(percentual(resultadoFinal))}`} destaque={corResultado(resultadoFinal)} />
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-mute)" }}>
                        Resultado final = valor de venda − despesas − descontos − investimento total. O percentual é calculado sobre o investimento total.
                      </p>
                    </>
                  ) : (
                    <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-mute)" }}>
                      O resultado final aparece após o registro da venda.
                    </p>
                  )}
                </div>
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
                <p style={titulo}>Fotos</p>
                {fotos.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "var(--text-mute)" }}>Nenhuma foto cadastrada.</p>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
                  {fotos.map((f) => f.url && (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                      <img src={f.url} alt="Foto do veículo" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }} />
                    </a>
                  ))}
                </div>
                {podeEditar && <UploadFotos veiculoId={veiculo.id} jaExistentes={fotos.length} onEnviado={carregar} />}
              </div>

              {podeEditar && (
                <div style={card}>
                  <ChecklistVeiculo veiculoId={veiculo.id} />
                </div>
              )}

              {podeEditar && veiculo.status !== "vendido" && (
                <div style={card}>
                  <VendaVeiculo veiculoId={veiculo.id} />
                </div>
              )}

              {gestao && (
                <div style={card}>
                  <p style={titulo}>Vendas</p>
                  {vendas.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "var(--text-mute)" }}>Nenhuma venda registrada.</p>}
                  {vendas.map((v) => (
                    <div key={v.id} style={{ borderBottom: "1px solid var(--border)", padding: "10px 0", fontSize: 13 }}>
                      <div style={{ color: "var(--text)", fontWeight: 700 }}>{formatarBRL(v.valor_venda)}</div>
                      <div style={{ color: "var(--text-mute)", fontSize: 12 }}>
                        {new Date(v.data_venda).toLocaleDateString("pt-BR")} · despesas {formatarBRL(v.despesas_venda ?? 0)} · descontos {formatarBRL(v.descontos ?? 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {podeEditar && (
                <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ ...titulo, margin: 0 }}>Excluir veículo</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-mute)" }}>Remove o veículo, fotos, custos, financiamento e histórico. Não pode ser desfeito.</p>
                  </div>
                  <button onClick={() => setConfirmarExclusao(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "9px 14px", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <Trash2 size={14} /> Excluir veículo
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={confirmarExclusao} onClose={() => setConfirmarExclusao(false)} title="Excluir veículo"
        footer={<PrimaryButton onClick={excluir} style={{ width: "100%" }}>Excluir definitivamente</PrimaryButton>}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6 }}>
          Tem certeza que deseja excluir <b style={{ color: "var(--text)" }}>{veiculo?.modelo}</b>? Fotos, custos, financiamento, checklist e vendas serão removidos. Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </PageTransition>
  );
}
