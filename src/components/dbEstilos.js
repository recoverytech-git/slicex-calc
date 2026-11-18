// Estilo compartilhado do painel (Dashboard, Custos e demais telas internas)
export const DB_CSS = `
.db-wrap{max-width:1440px;margin:0 auto;padding:24px 16px 56px;display:flex;flex-direction:column;gap:22px}
@media (min-width:640px){.db-wrap{padding:24px 24px 56px}}
@media (min-width:1024px){.db-wrap{padding:28px 32px 56px}}
.db-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:14px}
.db-eyebrow{font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b}
.db-title{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:clamp(22px,4vw,28px);font-weight:800;letter-spacing:-.02em;color:var(--text);margin:4px 0 2px;display:flex;align-items:center;gap:10px}
.db-sub{font-size:13px;color:var(--text-dim);margin:0}
.db-btn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;border-radius:12px;background:#2563eb;color:#fff;font-size:13px;font-weight:700;text-decoration:none;box-shadow:0 8px 16px -4px rgba(37,99,235,.35);transition:background .2s,transform .15s;white-space:nowrap}
.db-btn:hover{background:#1d4ed8;transform:translateY(-1px)}
.db-card{background:var(--surface);border:1px solid rgba(226,232,240,.8);border-radius:20px;box-shadow:0 1px 3px rgba(15,23,42,.03),0 10px 25px -5px rgba(15,23,42,.04);padding:20px;min-width:0}
.db-sec{display:flex;align-items:center;gap:10px;margin:6px 0 -6px}
.db-sec-ic{width:36px;height:36px;border-radius:12px;background:#eff6ff;color:#2563eb;border:1px solid #dbeafe;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.db-sec-t{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:15px;font-weight:800;color:var(--text);letter-spacing:.01em;text-transform:uppercase}
.db-kgrid{display:grid;gap:14px;width:100%;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
@media (min-width:1024px){.db-kgrid{display:grid;gap:14px;width:100%;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}}
.db-kpi{container-type:inline-size;min-width:0;background:var(--surface);border:1px solid rgba(226,232,240,.8);border-radius:18px;box-shadow:0 1px 3px rgba(15,23,42,.03),0 10px 25px -5px rgba(15,23,42,.04);padding:16px;min-width:0;display:flex;flex-direction:column;gap:10px}
.db-kpi-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.db-kpi-l{font-family:Inter,system-ui,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;line-height:1.3}
.db-kpi-v{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:clamp(13px,11cqi,24px);font-weight:800;color:var(--text);letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap;line-height:1.15}
.db-hbars{display:flex;flex-direction:column;gap:8px}
.db-hrow{display:grid;grid-template-columns:44px minmax(0,1fr) minmax(92px,auto);gap:10px;align-items:center}
.db-hlbl{font-size:12px;font-weight:700;color:var(--text-dim);text-transform:capitalize}
.db-htrack{height:12px;border-radius:999px;background:#eef2ff;overflow:hidden}
.db-hfill{height:100%;border-radius:999px;background:linear-gradient(90deg,#2563eb,#60a5fa);transition:width .6s cubic-bezier(.16,1,.3,1)}
.db-hval{font-size:12px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}

.db-grid-2{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.db-tbl-wrap{overflow-x:auto}
.db-tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.db-tbl th{font-family:Inter,system-ui,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;text-align:left;padding:10px;border-bottom:1px solid #e2e8f0;white-space:nowrap}
.db-tbl td{padding:12px 10px;border-bottom:1px solid #f1f5f9;color:var(--text);white-space:nowrap;font-variant-numeric:tabular-nums}
.db-tbl tr:last-child td{border-bottom:none}
.db-tbl tbody tr:hover td{background:#f8fafc}
.db-r{text-align:right !important}
.db-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.db-pill-azul{background:#eff6ff;color:#2563eb;border:1px solid #dbeafe}
.db-pill-verde{background:#ecfdf5;color:#059669;border:1px solid #a7f3d0}
.db-pill-ambar{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
.db-pill-verm{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
.db-chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.db-chip{height:34px;padding:0 14px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;font-size:12px;font-weight:700;color:var(--text-dim);cursor:pointer;transition:all .2s}
.db-chip:hover{border-color:#bfdbfe;color:#2563eb}
.db-chip.on{background:#2563eb;color:#fff;border-color:#2563eb;box-shadow:0 6px 14px -4px rgba(37,99,235,.35)}
.db-h3{font-family:"Plus Jakarta Sans",Inter,sans-serif;font-size:16px;font-weight:800;color:var(--text);margin:0}
.db-sub2{font-size:12px;color:var(--text-dim);margin:4px 0 0}
.db-head2{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.db-bar-linha{display:flex;align-items:center;gap:10px;min-width:0}
.db-bar-linha .db-htrack{flex:1;min-width:60px;max-width:220px}
@media (max-width:639px){.db-hrow{grid-template-columns:40px minmax(0,1fr)}.db-hval{grid-column:2;text-align:left}}
.db-kpi-ic{width:34px;height:34px;min-width:34px;border-radius:11px;background:#eff6ff;color:#2563eb;border:1px solid #dbeafe;display:flex;align-items:center;justify-content:center}
.db-kpi-s{font-size:11.5px;color:var(--text-mute)}
.db-charts{display:grid;gap:16px;grid-template-columns:1fr}
@media (min-width:1024px){.db-charts{grid-template-columns:repeat(2,minmax(0,1fr))}}
.db-bars{display:flex;align-items:flex-end;gap:clamp(3px,1.2vw,10px);height:180px;padding-top:22px}
.db-bar{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:6px;position:relative}
.db-bar-v{font-size:10px;font-weight:700;color:var(--text-dim);white-space:nowrap;font-variant-numeric:tabular-nums}
.db-bar-fill{width:100%;max-width:44px;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,#2563eb,rgba(37,99,235,.28));box-shadow:0 8px 18px rgba(37,99,235,.22);transition:height .6s cubic-bezier(.16,1,.3,1)}
.db-bar-l{font-size:10px;color:var(--text-mute);text-transform:capitalize;white-space:nowrap;overflow:hidden;text-overflow:clip;max-width:100%}
.db-status{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.db-stat{border:1px solid #e2e8f0;border-radius:14px;padding:12px;background:#f8fafc;min-width:0}
.db-stat-v{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;font-size:20px;font-weight:800;color:var(--text)}
.db-stat-l{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;overflow-wrap:anywhere}
.db-note{font-size:11.5px;color:var(--text-mute);margin:0}
@media (max-width:639px){
  .db-status{grid-template-columns:repeat(2,minmax(0,1fr))}
  .db-btn{height:40px;padding:0 14px}
}

.db-input{width:100%;height:44px;padding:0 14px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;font-size:14px;color:#0f172a;outline:none;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}
.db-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.db-label{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:6px}
.db-btn-sec{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px;border-radius:12px;background:#fff;color:#0f172a;font-size:13px;font-weight:700;border:1px solid #cbd5e1;cursor:pointer;transition:background .2s}
.db-btn-sec:hover{background:#f8fafc}
.db-btn-prim{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;border-radius:12px;background:#2563eb;color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;box-shadow:0 8px 16px -4px rgba(37,99,235,.35);transition:background .2s}
.db-btn-prim:hover{background:#1d4ed8}
.db-btn-prim:disabled{opacity:.55;cursor:not-allowed}
.db-empty{text-align:center;color:#64748b;font-size:14px;padding:28px 12px}

.db-scen{display:grid;gap:14px;grid-template-columns:1fr;width:100%}
@media (min-width:640px){.db-scen{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (min-width:1100px){.db-scen{grid-template-columns:repeat(3,minmax(0,1fr))}}
.db-scen .db-kpi{min-height:100%;justify-content:flex-start}
.db-alerta-linha{flex-basis:100%;font-size:13px;color:var(--text-dim);margin-top:4px}

.db-kgrid-4{display:grid;gap:14px;width:100%;grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:640px){.db-kgrid-4{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (min-width:1000px){.db-kgrid-4{grid-template-columns:repeat(4,minmax(0,1fr))}}
`;
