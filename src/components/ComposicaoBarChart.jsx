import { useState } from "react";
import { fmt, fmtK } from "../lib/format";

export default function ComposicaoBarChart({ data }) {
  const [hover, setHover] = useState(null);
  const W = 700, H = 260, padL = 55, padR = 20, padT = 20, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.Juros + d.Amortização), 1);
  const bw = (innerW / data.length) * 0.6;
  const gap = (innerW / data.length) * 0.4;
  const x = (i) => padL + i * (innerW / data.length) + gap / 2;
  const y = (v) => padT + innerH - (v / maxVal) * innerH;
  const h = (v) => (v / maxVal) * innerH;

  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => (maxVal / yTicks) * i);

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {yTickVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#2a2a2a" strokeDasharray="3 3" />
            <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#737373">
              {fmtK(v)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const amortH = h(d.Amortização);
          const jurosH = h(d.Juros);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <rect x={x(i)} y={y(d.Amortização)} width={bw} height={amortH} fill="#d9d9d9" rx="2" opacity={hover === i ? 1 : 0.9} />
              <rect x={x(i)} y={y(d.Amortização) - jurosH} width={bw} height={jurosH} fill="#595959" opacity={hover === i ? 1 : 0.9} />
            </g>
          );
        })}

        {data.map(
          (d, i) =>
            i % Math.ceil(data.length / 8) === 0 && (
              <text key={i} x={x(i) + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#737373">
                {d.mes}
              </text>
            )
        )}
      </svg>

      {hover !== null && (
        <div
          style={{
            position: "absolute", pointerEvents: "none",
            left: `${((x(hover) + bw / 2) / W) * 100}%`, top: 10, transform: "translateX(-50%)",
            background: "#1c1c1c", border: "1px solid #333333", borderRadius: 8,
            padding: "6px 10px", fontSize: 11, whiteSpace: "nowrap", color: "#f2f2f2",
          }}
        >
          <div style={{ color: "#a3a3a3", fontWeight: 700 }}>Mês {data[hover].mes}</div>
          <div>Juros: <b style={{ color: "#d9d9d9" }}>{fmt(data[hover].Juros)}</b></div>
          <div>Amortização: <b style={{ color: "#ffffff" }}>{fmt(data[hover].Amortização)}</b></div>
        </div>
      )}
    </div>
  );
}
