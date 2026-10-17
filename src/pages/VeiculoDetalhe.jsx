import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Plus } from "lucide-react";
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
                  <Secao n={4} nome="Custos adicionais">
                    {custos.length === 0 && <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-mute)" }}>Nenhum custo adicional.</p>}
                    {custos.map((c) => <Linha key={c.id} label={c.descricao} valor={moeda(c.valor)} />)}
                    <Linha label="Total de custos adicionais" valor={formatarBRL(totalCustos)} />
                    {podeEditar && (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                        <Field label="Descrição do custo" val={novoCusto.descricao} set={(v) => setNovoCusto({ ...novoCusto, descricao: v })} hint="Ex: Documentação, pneus…" />
                        <MoneyField label="Valor do custo" valor={novoCusto.valor} onChange={(n) => setNovoCusto({ ...novoCusto, valor: n })} />
                        <PrimaryButton onClick={adicionarCusto} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Plus size={15} /> Adicionar custo
                        </PrimaryButton>
                      </div>
                    )}
                  </Secao>

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
                <p style={titulo}>Fotos</p>
                {fotos.length === 0 && <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-mute)" }}>Nenhuma foto cadastrada.</p>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
                  {fotos.map((f) => f.url && (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                      <img src={f.url} alt="Foto do veículo" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }} />
                    </a>
                  ))}
                </div>
                {podeEditar && <div style={{ marginTop: 14 }}><UploadFotos veiculoId={veiculo.id} jaExistentes={fotos.length} onEnviado={carregar} /></div>}
              </div>

              {podeEditar && (
                <div style={card}>
                  <p style={titulo}>Checklist do veículo</p>
                  <ChecklistVeiculo veiculoId={veiculo.id} />
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
