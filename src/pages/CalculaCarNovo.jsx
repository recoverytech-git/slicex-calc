// Calcula-Car (versao em teste): design do HTML em iframe, mesmo estado e mesmos calculos da tela atual
import { useEffect, useMemo, useRef } from "react";
import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import { useRascunho } from "../lib/rascunho";
import { parseMoeda } from "../lib/moeda";
import { fmt, toF } from "../lib/format";
import { calcDiferenca, MARGEM_REFERENCIA_PCT } from "../lib/calculaCar";

export default function CalculaCarNovo() {
  const frame = useRef(null);
  const [modelo, setModelo] = useRascunho("cc.modelo", "");
  const [placa, setPlaca] = useRascunho("cc.placa", "");
  const [renavam, setRenavam] = useRascunho("cc.renavam", "");
  const [chassi, setChassi] = useRascunho("cc.chassi", "");
  const [marca, setMarca] = useRascunho("cc.marca", "");
  const [anoFab, setAnoFab] = useRascunho("cc.anoFab", "");
  const [anoMod, setAnoMod] = useRascunho("cc.anoMod", "");
  const [cor, setCor] = useRascunho("cc.cor", "");
  const [km, setKm] = useRascunho("cc.km", "");
  const [combustivel, setCombustivel] = useRascunho("cc.combustivel", "");
  const [cambio, setCambio] = useRascunho("cc.cambio", "");
  const [numeroMotor, setNumeroMotor] = useRascunho("cc.numeroMotor", "");
  const [categoria, setCategoria] = useRascunho("cc.categoria", "");
  const [potenciaMotor, setPotenciaMotor] = useRascunho("cc.potenciaMotor", "");
  const [portas, setPortas] = useRascunho("cc.portas", "");
  const [lugares, setLugares] = useRascunho("cc.lugares", "");
  const [dataAquisicao, setDataAquisicao] = useRascunho("cc.dataAquisicao", "");
  const [fipeStr, setFipeStr] = useRascunho("cc.fipeStr", "");
  const [compraStr, setCompraStr] = useRascunho("cc.compraStr", "");
  const [vendaStr, setVendaStr] = useRascunho("cc.vendaStr", "");
  const [valorBemStr, setValorBemStr] = useRascunho("cc.valorBemStr", "");
  const [entradaStr, setEntradaStr] = useRascunho("cc.entradaStr", "");
  const [taxaStr, setTaxaStr] = useRascunho("cc.taxaStr", "");
  const [mesesStr, setMesesStr] = useRascunho("cc.mesesStr", "");
  const [tipoCapital, setTipoCapital] = useRascunho("cc.tipoCapital", "Próprio");
  const [sistema, setSistema] = useRascunho("cc.sistema", "Price");

  const fipe = toF(fipeStr);
  const compra = toF(compraStr);
  const veiculoValido = fipe > 0 && compra > 0;
  const diferenca = useMemo(() => (veiculoValido ? calcDiferenca(fipe, compra) : null), [veiculoValido, fipe, compra]);

  const valores = { modelo, placa, renavam, chassi, marca, anoFab, anoMod, cor, km, combustivel, cambio,
    numeroMotor, categoria, potenciaMotor, portas, lugares, dataAquisicao, fipeStr, compraStr, vendaStr,
    valorBemStr, entradaStr, taxaStr, mesesStr, tipoCapital, sistema };
  const setters = { modelo: setModelo, placa: setPlaca, renavam: setRenavam, chassi: setChassi, marca: setMarca,
    anoFab: setAnoFab, anoMod: setAnoMod, cor: setCor, km: setKm, combustivel: setCombustivel, cambio: setCambio,
    numeroMotor: setNumeroMotor, categoria: setCategoria, potenciaMotor: setPotenciaMotor, portas: setPortas,
    lugares: setLugares, dataAquisicao: setDataAquisicao, fipeStr: setFipeStr, compraStr: setCompraStr, vendaStr: setVendaStr,
    valorBemStr: setValorBemStr, entradaStr: setEntradaStr, taxaStr: setTaxaStr, mesesStr: setMesesStr, tipoCapital: setTipoCapital, sistema: setSistema };

  function envia() {
    frame.current?.contentWindow?.postMessage({ type: "estado", campos: valores, analise: {
      diferencaReais: diferenca ? fmt(diferenca.diferencaReais) : "—",
      diferencaPct: diferenca && diferenca.diferencaPercentual != null ? `${diferenca.diferencaPercentual.toFixed(2)}%` : "—",
      margemRef: `${MARGEM_REFERENCIA_PCT}%`,
    } }, window.location.origin);
  }

  useEffect(() => { envia(); });

  useEffect(() => {
    const ouvir = (e) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data || {};
      if (d.type === "pronto") envia();
      if (d.type === "campo" && setters[d.k]) {
        const v = String(d.v ?? "");
        const DINHEIRO = ["fipeStr", "compraStr", "vendaStr", "valorBemStr", "entradaStr"];
        const valor = DINHEIRO.includes(d.k) ? (v === "" ? "" : String(parseMoeda(v))) : v;
        setters[d.k](valor);
      }
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  });

  return (
    <PageTransition>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header subtitle="Calcula-Car (versão em teste)" />
        <iframe ref={frame} src="/calculadora-carro.html" title="Calcula-Car"
          onLoad={envia} style={{ display: "block", width: "100%", flex: 1, minHeight: 0, border: 0 }} />
      </div>
    </PageTransition>
  );
}
