/** Paleta e base visual compartilhadas pelas páginas públicas (login e landing), conforme o DESIGN.md. */
export const CC_PALETA_CSS = `
.cc-page{
  --surface:#f8f9ff; --surface-lowest:#ffffff; --surface-low:#eff4ff; --surface-container:#e5eeff; --surface-high:#dce9ff;
  --surface-highest:#d3e4fe; --surface-variant:#d3e4fe; --surface-3:#e5eeff;
  --on-surface:#0b1c30; --on-variant:#434655; --outline-variant:#c3c6d7; --tertiary:#4d556b;
  --primary:#004ac6; --primary-c:#2563eb; --secondary:#006c49; --secondary-c:#6cf8bb;
  --secondary-fixed:#6ffbbe; --on-secondary-fixed:#002113; --primary-fixed:#dbe1ff;
  --glass:rgba(248,249,255,0.82); --glass-card:rgba(255,255,255,0.9); --input-bg:rgba(229,238,255,0.7);
  --ring:rgba(37,99,235,0.18); --card-shadow:0 24px 60px -12px rgba(0,74,198,0.15),0 8px 24px rgba(11,28,48,0.05);
  --glow:rgba(37,99,235,0.15); --live-bg:rgba(229,238,255,0.6);
  font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif; background:var(--surface); color:var(--on-surface);
  min-height:100vh; position:relative; overflow-x:clip;
}
.cc-page[data-paleta="dark"]{
  --surface:#000000; --surface-lowest:#141414; --surface-low:#0f0f0f; --surface-container:#1c1c1c; --surface-high:#242424;
  --surface-highest:#2a2a2a; --surface-variant:#2a2a2a; --surface-3:#1c1c1c;
  --on-surface:#f5f5f5; --on-variant:#9198A1; --outline-variant:#2a2a2a; --tertiary:#9198A1;
  --primary:#4493F8; --primary-c:#2F6FD6; --secondary:#10b981; --secondary-c:#10b981;
  --secondary-fixed:rgba(16,185,129,0.25); --on-secondary-fixed:#a7f3d0; --primary-fixed:rgba(68,147,248,0.14);
  --glass:rgba(0,0,0,0.8); --glass-card:rgba(20,20,20,0.9); --input-bg:rgba(28,28,28,0.7);
  --ring:rgba(68,147,248,0.25); --card-shadow:0 24px 60px -12px rgba(0,0,0,0.6);
  --glow:rgba(68,147,248,0.12); --live-bg:rgba(28,28,28,0.6);
}
`;

export const CC_BASE_CSS = `
${CC_PALETA_CSS}
.cc-header{position:fixed;top:0;left:0;right:0;z-index:50;height:64px;background:var(--glass);backdrop-filter:blur(20px);box-shadow:0 1px 8px rgba(0,0,0,0.04)}
.cc-header-in{height:64px;max-width:1200px;margin:0 auto;padding:0 clamp(16px,4vw,40px);display:flex;align-items:center;justify-content:space-between;gap:12px}
.cc-pill{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:12px;border:1px solid var(--surface-variant);background:var(--surface-lowest);color:var(--on-surface);font-family:Inter,sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-decoration:none;box-shadow:0 1px 3px rgba(11,28,48,0.06);transition:all .2s ease;cursor:pointer;white-space:nowrap}
.cc-pill:hover{background:var(--surface-container);transform:translateY(-1px);box-shadow:0 6px 16px -4px rgba(37,99,235,0.18)}
.cc-pill:active{transform:scale(0.98)}
.cc-pill svg{color:var(--primary)}
.cc-pill-wa svg{color:#25D366}
@media (max-width:640px){.cc-pill-txt{display:none}.cc-pill{width:38px;padding:0;justify-content:center}}
.cc-iconbtn{width:36px;height:36px;border-radius:12px;background:var(--surface-container);color:var(--on-variant);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .3s;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
.cc-iconbtn:hover{background:var(--surface-high);color:var(--on-surface);transform:rotate(12deg)}
.cc-iconbtn:active{transform:scale(0.95)}
.cc-spin{animation:ccSpin .9s linear infinite}
@keyframes ccSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){
  .cc-page *,.cc-page *::before,.cc-page *::after{animation:none !important;transition:none !important}
}
`;
