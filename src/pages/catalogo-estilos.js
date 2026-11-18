// Estilo compartilhado do catalogo publico (mesma linguagem visual da Estoque)
export const CATALOGO_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
.cat{min-height:100vh;background:#f8f9ff;color:#0f172a;font-family:Inter,system-ui,sans-serif}
.cat-top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid #e2e8f0}
.cat-top-in{max-width:1440px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.cat-logo{height:30px;width:auto}
.cat-loja{font-family:"Plus Jakarta Sans",Inter,sans-serif;font-weight:800;font-size:15px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55%}
.cat-wrap{max-width:1440px;margin:0 auto;padding:20px 16px 56px;display:flex;flex-direction:column;gap:18px}
@media (min-width:640px){.cat-wrap{padding:24px 24px 56px}}
@media (min-width:1024px){.cat-wrap{padding:28px 32px 56px}}
.cat-hero{background:#fff;border:1px solid rgba(226,232,240,.8);border-radius:22px;box-shadow:0 1px 3px rgba(15,23,42,.03),0 10px 25px -5px rgba(15,23,42,.04);padding:22px}
.cat-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b}
.cat-h1{font-family:"Plus Jakarta Sans",Inter,sans-serif;font-size:clamp(22px,4vw,30px);font-weight:800;letter-spacing:-.02em;margin:4px 0 14px}
.cat-search{display:flex;align-items:center;gap:10px;height:52px;padding:0 16px;border-radius:14px;border:1px solid #cbd5e1;background:#fff;transition:border-color .2s,box-shadow .2s}
.cat-search:focus-within{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.cat-search input{flex:1;border:none;outline:none;font-size:15px;background:transparent;color:#0f172a;min-width:0}
.cat-chips{display:flex;gap:8px;overflow-x:auto;padding:14px 0 2px;scrollbar-width:none}
.cat-chips::-webkit-scrollbar{display:none}
.cat-sel{height:40px;padding:0 12px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;font-size:13px;font-weight:600;color:#0f172a;flex-shrink:0;cursor:pointer}
.cat-sel:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.cat-count{font-size:13px;color:#64748b;margin:0}
.cat-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.cat-card{background:#fff;border:1px solid rgba(226,232,240,.8);border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.03),0 10px 25px -5px rgba(15,23,42,.04);text-decoration:none;color:inherit;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s}
.cat-card:hover{transform:translateY(-3px);box-shadow:0 18px 32px -10px rgba(15,23,42,.14)}
.cat-img{aspect-ratio:4/3;background:#eef2ff;position:relative;overflow:hidden}
.cat-img img{width:100%;height:100%;object-fit:cover;display:block}
.cat-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px}
.cat-badge{position:absolute;top:10px;left:10px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.94);font-size:11px;font-weight:700;color:#059669;box-shadow:0 2px 6px rgba(15,23,42,.1)}
.cat-body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
.cat-name{font-family:"Plus Jakarta Sans",Inter,sans-serif;font-size:15px;font-weight:800;line-height:1.25;margin:0}
.cat-meta{display:flex;flex-wrap:wrap;gap:6px}
.cat-tag{font-size:11px;font-weight:600;color:#475569;background:#f1f5f9;border-radius:8px;padding:3px 8px}
.cat-price{margin-top:auto;font-family:"Plus Jakarta Sans",Inter,sans-serif;font-size:19px;font-weight:800;color:#2563eb;font-variant-numeric:tabular-nums}
.cat-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 22px;border-radius:13px;border:none;background:#2563eb;color:#fff;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 8px 16px -4px rgba(37,99,235,.35);text-decoration:none;transition:background .2s,transform .15s}
.cat-btn:hover{background:#1d4ed8;transform:translateY(-1px)}
.cat-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
.cat-btn-ghost{background:#fff;color:#0f172a;border:1px solid #cbd5e1;box-shadow:none}
.cat-btn-ghost:hover{background:#f8fafc}
.cat-empty{text-align:center;padding:40px 16px;color:#64748b;background:#fff;border-radius:18px;border:1px dashed #cbd5e1}
.cat-err{padding:24px;border-radius:16px;background:#fef2f2;color:#b91c1c;font-size:14px}
.cat-det{display:grid;gap:18px;grid-template-columns:1fr}
@media (min-width:1024px){.cat-det{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:start}}
.cat-gal{background:#fff;border:1px solid rgba(226,232,240,.8);border-radius:22px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.03),0 10px 25px -5px rgba(15,23,42,.04)}
.cat-main{aspect-ratio:16/10;background:#eef2ff;display:flex;align-items:center;justify-content:center}
.cat-main img{width:100%;height:100%;object-fit:cover}
.cat-thumbs{display:flex;gap:8px;padding:10px;overflow-x:auto}
.cat-thumb{width:72px;height:54px;border-radius:10px;overflow:hidden;border:2px solid transparent;flex-shrink:0;padding:0;background:#eef2ff;cursor:pointer}
.cat-thumb.on{border-color:#2563eb}
.cat-thumb img{width:100%;height:100%;object-fit:cover}
.cat-info{background:#fff;border:1px solid rgba(226,232,240,.8);border-radius:22px;padding:22px;box-shadow:0 1px 3px rgba(15,23,42,.03),0 10px 25px -5px rgba(15,23,42,.04);display:flex;flex-direction:column;gap:14px;position:sticky;top:80px}
.cat-h2{font-family:"Plus Jakarta Sans",Inter,sans-serif;font-size:clamp(20px,3vw,26px);font-weight:800;letter-spacing:-.01em;margin:0}
.cat-spec{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.cat-spec div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;min-width:0}
.cat-spec b{display:block;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
.cat-spec span{font-size:14px;font-weight:700;color:#0f172a;overflow-wrap:anywhere}
.cat-bigprice{font-family:"Plus Jakarta Sans",Inter,sans-serif;font-size:clamp(26px,4vw,34px);font-weight:800;color:#2563eb;font-variant-numeric:tabular-nums}
.cat-form{display:flex;flex-direction:column;gap:10px}
.cat-in{height:46px;padding:0 14px;border-radius:12px;border:1px solid #cbd5e1;font-size:15px;color:#0f172a;outline:none;background:#fff;width:100%;box-sizing:border-box}
.cat-in:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
textarea.cat-in{height:auto;min-height:76px;padding:12px 14px;resize:vertical}
.cat-ok{padding:16px;border-radius:14px;background:#ecfdf5;color:#047857;font-size:14px;font-weight:600}
.cat-erro{font-size:13px;color:#b91c1c;font-weight:600}
.cat-foot{text-align:center;font-size:12px;color:#94a3b8;padding:8px 0}

.cat-card-wrap{position:relative;display:flex;flex-direction:column}
.cat-fipe{position:absolute;bottom:10px;left:10px;display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;background:#059669;color:#fff;font-size:11px;font-weight:700;box-shadow:0 6px 14px -4px rgba(5,150,105,.45)}
.cat-card-acoes{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 4px 4px}
.cat-fav{width:38px;height:38px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;color:#64748b;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
.cat-fav:hover{color:#e11d48;border-color:#fecdd3}
.cat-fav.on{color:#e11d48;background:#fff1f2;border-color:#fecdd3}
.cat-cmp{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 12px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;font-size:12px;font-weight:700;color:#475569;cursor:pointer}
.cat-cmp input{position:absolute;opacity:0;pointer-events:none}
.cat-cmp.on{background:#eff6ff;color:#2563eb;border-color:#bfdbfe}
.cat-cmp.off{opacity:.45;cursor:not-allowed}
.cat-toggle{display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.cat-toggle.on{background:#2563eb;color:#fff;border-color:#2563eb}
.cat-bar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:30;display:flex;align-items:center;gap:16px;padding:10px 12px 10px 20px;border-radius:18px;background:#0f172a;color:#fff;box-shadow:0 20px 40px -12px rgba(15,23,42,.45);max-width:calc(100vw - 32px)}
.cat-bar .cat-btn{background:#2563eb}
.cat-modal{position:fixed;inset:0;z-index:40;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px}
.cat-modal-in{background:#fff;border-radius:22px;padding:22px;width:100%;max-width:880px;max-height:88vh;overflow:auto;box-shadow:0 30px 60px -20px rgba(15,23,42,.4)}
.cat-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.cat-table th,.cat-table td{padding:11px 12px;border-bottom:1px solid #f1f5f9;text-align:left;vertical-align:top;min-width:150px}
.cat-table thead th{font-family:"Plus Jakarta Sans",Inter,sans-serif;font-size:14px;font-weight:800;color:#0f172a}
.cat-table tbody th{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;white-space:nowrap}

.cat-card-box{display:flex;flex-direction:column;overflow:hidden;padding:0}
.cat-card-link{display:flex;flex-direction:column;flex:1;color:inherit;text-decoration:none}
.cat-card-acoes{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px 16px;border-top:1px solid #f1f5f9}
.cat-left{display:flex;flex-direction:column;gap:18px;min-width:0}
.cat-info-ext{padding:20px}
.cat-lightbox{position:fixed;inset:0;z-index:60;background:rgba(2,6,23,.94);display:flex;align-items:center;justify-content:center;padding:24px}
.cat-lb-img{max-width:100%;max-height:100%;object-fit:contain;border-radius:12px}
.cat-lb-btn{position:absolute;width:52px;height:52px;border-radius:16px;border:1px solid rgba(255,255,255,.2);background:rgba(15,23,42,.6);color:#fff;font-size:26px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.cat-lb-btn:hover{background:rgba(37,99,235,.7)}
.cat-lb-x{top:18px;right:18px;font-size:18px}
.cat-lb-prev{left:18px;top:50%;transform:translateY(-50%)}
.cat-lb-next{right:18px;top:50%;transform:translateY(-50%)}
.cat-lb-count{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:#fff;font-size:13px;font-weight:700;background:rgba(15,23,42,.6);padding:6px 14px;border-radius:999px}
`;
