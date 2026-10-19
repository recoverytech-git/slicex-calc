import { useState } from "react";
import { fmt, fmtK } from "../lib/format";

const W = 760, H = 300, PADL = 72, PADR = 14, PADT = 14, PADB = 30;

function indicePelo(evento, n) {
  const r = evento.currentTarget.getBoundingClientRect();
  const rel = ((evento.clientX - r.left) / r.width) * W;
  const innerW = W - PADL - PADR;
  const i = Math.round(((rel - PADL) / innerW) * (n - 1));
  return Math.min(n - 1, Math.max(0, i));
}

function marcasX(n) {
  const passo = Math.max(1, Math.ceil(n / 6));
  return Array.from({ length: n }, (_, i) => i).filter((i) => i === 0 || (i + 1) % passo === 0 || i === n - 1);
}

/** Linhas comparativas (ex.: saldo devedor Price x SAC) com tooltip mês a mês. */
export function GraficoLinhas({ series, n }) {
  const [hover, setHover] = useState(null);
  if (!n || !series.length) return null;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
  const max = Math.max(1, ...series.flatMap((s) => s.valores));
  const x = (i) => PADL + (n === 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v) => PADT + innerH - (Math.max(0, v) / max) * innerH;
  const tiques = [0, 1, 2, 3, 4].map((k) => (max / 4) * k);
  const caminho = (vals) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", touchAction: "none" }}
        onMouseMove={(e) => setHover(indicePelo(e, n))} onMouseLeave={() => setHover(null)}
        role="img" aria-label="Gráfico de evolução do saldo devedor, passe o mouse para ver cada mês">
        {tiques.map((t, k) => (
          <g key={k}>
            <line x1={PADL} x2={W - PADR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="4 4" />
            <text x={PADL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-mute)">{fmtK(t)}</text>
          </g>
        ))}
        {marcasX(n).map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-mute)">{`Mês ${i + 1}`}</text>
        ))}
        {series.map((s) => (
          <path key={s.nome} d={caminho(s.valores)} fill="none" stroke={s.cor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PADT} y2={H - PADB} stroke="var(--text-mute)" strokeDasharray="3 3" />
            {series.map((s) => (
              <circle key={s.nome} cx={x(hover)} cy={y(s.valores[hover])} r="4.5" fill={s.cor} stroke="var(--surface)" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div style={{ position: "absolute", top: 6, left: `clamp(8px, ${(x(hover) / W) * 100}%, calc(100% - 190px))`, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: 12, boxShadow: "var(--shadow-md)", pointerEvents: "none", minWidth: 180 }}>
          <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Mês {hover + 1}</div>
          {series.map((s) => (
            <div key={s.nome} style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--text-dim)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: s.cor }} />{s.nome}
              </span>
              <b style={{ color: "var(--text)" }}>{fmt(s.valores[hover])}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Barras empilhadas: amortização (base) + juros (topo) de cada parcela. */
export function GraficoBarras({ amortizacao, juros, cores }) {
  const [hover, setHover] = useState(null);
  const n = amortizacao.length;
  if (!n) return null;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
  const max = Math.max(1, ...amortizacao.map((a, i) => a + juros[i]));
  const slot = innerW / n;
  const largura = Math.max(1.2, slot * 0.72);
  const bx = (i) => PADL + i * slot + (slot - largura) / 2;
  const hb = (v) => (v / max) * innerH;
  const base = PADT + innerH;
  const tiques = [0, 1, 2, 3, 4].map((k) => (max / 4) * k);
  const marcas = marcasX(n);

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}
        onMouseMove={(e) => setHover(indicePelo(e, n))} onMouseLeave={() => setHover(null)}
        role="img" aria-label="Composição de cada parcela entre amortização e juros">
        {tiques.map((t, k) => (
          <g key={k}>
            <line x1={PADL} x2={W - PADR} y1={base - hb(t)} y2={base - hb(t)} stroke="var(--border)" strokeDasharray="4 4" />
            <text x={PADL - 8} y={base - hb(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-mute)">{fmtK(t)}</text>
          </g>
        ))}
        {amortizacao.map((a, i) => {
          const hA = hb(a), hJ = hb(juros[i]);
          return (
            <g key={i} opacity={hover === null || hover === i ? 1 : 0.35}>
              <rect x={bx(i)} y={base - hA} width={largura} height={Math.max(0, hA)} fill={cores.amort} />
              <rect x={bx(i)} y={base - hA - hJ} width={largura} height={Math.max(0, hJ)} fill={cores.juros} />
            </g>
          );
        })}
        {marcas.map((i) => (
          <text key={i} x={bx(i) + largura / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-mute)">{`Mês ${i + 1}`}</text>
        ))}
      </svg>
      {hover !== null && (
        <div style={{ position: "absolute", top: 6, left: `clamp(8px, ${((bx(hover) + largura / 2) / W) * 100}%, calc(100% - 200px))`, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: 12, boxShadow: "var(--shadow-md)", pointerEvents: "none", minWidth: 190 }}>
          <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Mês {hover + 1}</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--text-dim)" }}><span>Amortização</span><b style={{ color: "var(--text)" }}>{fmt(amortizacao[hover])}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--text-dim)" }}><span>Juros</span><b style={{ color: "var(--text)" }}>{fmt(juros[hover])}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--text-dim)", borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 4 }}><span>Parcela</span><b style={{ color: "var(--text)" }}>{fmt(amortizacao[hover] + juros[hover])}</b></div>
        </div>
      )}
    </div>
  );
}
