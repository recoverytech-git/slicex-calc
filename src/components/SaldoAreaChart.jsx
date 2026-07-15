import { useState } from "react";
import { fmt, fmtK } from "../lib/format";

export default function SaldoAreaChart({ data, field = "Saldo devedor", label = "Saldo" }) {
  const [hover, setHover] = useState(null);
  const W = 700, H = 260, padL = 55, padR = 20, padT = 20, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d[field]), 1);
  const x = (i) => padL + (i / (data.length - 1 || 1)) * innerW;
  const y = (v) => padT + innerH - (v / maxVal) * innerH;

  const linePts = data.map((d, i) => `${x(i)},${y(d[field])}`).join(" L ");
  const areaPath = `M ${x(0)},${padT + innerH} L ${linePts} L ${x(data.length - 1)},${padT + innerH} Z`;
  const linePath = `M ${linePts}`;

  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => (maxVal / yTicks) * i);

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((relX - padL) / innerW) * (data.length - 1));
    if (idx >= 0 && idx < data.length) setHover(idx);
  };

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f2f2f2" stopOpacity="0.35" />
            <stop offset="95%" stopColor="#f2f2f2" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTickVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#2a2a2a" strokeDasharray="3 3" />
            <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#737373">
              {fmtK(v)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="#e5e5e5" strokeWidth="2.5" />

        {data.map(
          (d, i) =>
            i % Math.ceil(data.length / 8) === 0 && (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#737373">
                {d.mes}
              </text>
            )
        )}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="#ffffff" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={x(hover)} cy={y(data[hover][field])} r="4" fill="#ffffff" />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          style={{
            position: "absolute", pointerEvents: "none",
            left: `${(x(hover) / W) * 100}%`, top: 10, transform: "translateX(-50%)",
            background: "#1c1c1c", border: "1px solid #333333", borderRadius: 8,
            padding: "6px 10px", fontSize: 11, whiteSpace: "nowrap", color: "#f2f2f2",
          }}
        >
          <div style={{ color: "#a3a3a3", fontWeight: 700 }}>Mês {data[hover].mes}</div>
          <div>
            {label}: <b style={{ color: "#ffffff" }}>{fmt(data[hover][field])}</b>
          </div>
        </div>
      )}
    </div>
  );
}
