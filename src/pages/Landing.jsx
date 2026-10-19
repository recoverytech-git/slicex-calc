// sem-rascunho: página pública sem formulário
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Landmark, Car, Warehouse, ShieldCheck, TrendingUp, Banknote, ArrowRight, LogIn, Zap, Calculator, WalletCards, PauseCircle, PlayCircle, ExternalLink, Users, Headset, ChevronRight, Lightbulb, LayoutGrid, ListOrdered } from "lucide-react";
import PageTransition from "../components/PageTransition";
import WhatsAppIcon from "../components/WhatsAppIcon";
import { CC_BASE_CSS } from "../components/ccPaleta";
import { useMarca } from "../lib/marca";
import { CADASTRO_WHATSAPP, SUPORTE_WHATSAPP } from "../lib/contato";

const IMAGEM_HERO = "https://lh3.googleusercontent.com/aida/AEtjO1VaaOMujZEwacci69jAP5lLN-iMfA-m60WA28agPRbcLCMLpU2RcYdjicwUSiDVzlmazbaxQLZLGVNdEvfykZcUJE_rN2zalYw4gvHs6aSzohfntvwljlLaWjEEbpVm6l4MxIDKtn2t1jcS653fiSlwInWB8XATYf1F-Adw5xj3zen5Y_VqYViUagrjbbXhUOSh1Ygv5i3EgK7TlrVJyWb_03jyB2HLdI7oOGFZ2xlwXlwpIY1IPFZzHBvk";
const TEXTO_HERO = "Saiba quanto sobra de VERDADE\nem cada compra e venda de veículo.";

const RECURSOS = [
  { icon: Landmark, tag: "Simulador SAC/Price", titulo: "Financiamento e amortização", texto: "Simule Price ou SAC, veja a evolução da dívida e descubra se vale mais reduzir o prazo ou a parcela após um aporte.", rodape: "Várias calculadoras disponíveis para você.", classe: "ld-f1" },
  { icon: Car, tag: "Margem & FIPE", titulo: "Calcula-Car", texto: "Compare o valor FIPE com a compra, some custos como documentação e revisão e veja o resultado líquido da operação.", rodape: "Calcula toda a operação em segundos.", classe: "ld-f2" },
  { icon: Warehouse, tag: "Exportação em 1 Clique", titulo: "Estoque", texto: "Cadastre veículos com fotos, busque por PLACA, RENAVAM ou CHASSI e exporte o estoque em PDF.", rodape: "Seu estoque inteiro na palma da sua mão.", classe: "ld-f3" },
  { icon: ShieldCheck, tag: "Controle de Acessos", titulo: "Acesso por perfil", texto: "Lojista, Gerente e Vendedor acessam apenas o que cada função precisa.", rodape: "Você designa qual função cada um exerce na sua loja.", classe: "ld-f4" },
];

const PASSOS = [
  { n: 1, titulo: "Credenciamento Seguro", texto: "Entre com o acesso fornecido pela sua loja." },
  { n: 2, titulo: "Cadastro e Despesas", texto: "Cadastre o veículo com dados, custos e fotos." },
  { n: 3, titulo: "Controle & Tomada de Decisão", texto: "Analise a operação e acompanhe o estoque." },
];

const CENARIOS = [
  { compra: 68000, custos: 3200 },
  { compra: 54000, custos: 2400 },
  { compra: 82500, custos: 4600 },
  { compra: 96000, custos: 5800 },
  { compra: 74000, custos: 3800 },
  { compra: 61500, custos: 2900 },
];
const PASSO_MS = 3000;
const TRANSICAO_MS = 1600;
const RETOMAR_MS = 3500;

const CSS = `
${CC_BASE_CSS}
.ld-main{position:relative;background:linear-gradient(to bottom,var(--surface-low),var(--surface) 50%,var(--surface-lowest))}
.ld-glow{pointer-events:none;position:absolute;border-radius:999px;filter:blur(110px);z-index:0}
.ld-anchor{scroll-margin-top:96px}
.ld-hero{position:relative;max-width:1200px;margin:0 auto;padding:112px 24px 40px;text-align:center}
.ld-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:4px 14px;border-radius:999px;background:var(--surface-container);box-shadow:0 1px 2px rgba(0,0,0,0.05);font-family:Inter,sans-serif;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--primary)}
.ld-dot{width:7px;height:7px;border-radius:999px;background:var(--primary);animation:ldBlink 2s ease-in-out infinite}
.ld-h1{margin:18px auto 0;max-width:880px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:clamp(30px,4.4vw,48px);line-height:1.12;letter-spacing:-0.03em;color:var(--on-surface);white-space:pre-line;min-height:2.3em}
.ld-cursor{display:inline-block;margin-left:2px;color:var(--primary);font-weight:300;animation:ldBlink .8s infinite}
.ld-ctarow{margin-top:28px;display:flex;flex-direction:column;align-items:center;gap:14px}
@media (min-width:640px){.ld-ctarow{flex-direction:row;justify-content:center}}
.ld-cta{display:inline-flex;align-items:center;gap:8px;padding:13px 28px;border-radius:12px;background:var(--primary-c);color:#ffffff;font-family:Inter,sans-serif;font-size:14px;font-weight:600;letter-spacing:.02em;text-decoration:none;box-shadow:0 12px 24px -6px rgba(37,99,235,0.4);transition:all .3s ease}
.ld-cta:hover{background:var(--primary);box-shadow:0 16px 32px -4px rgba(37,99,235,0.55);transform:translateY(-2px)}
.ld-cta:hover .ld-arrow{transform:translateX(4px)}
.ld-arrow{transition:transform .3s ease}
.ld-secure{display:inline-flex;align-items:center;gap:6px;font-family:Inter,sans-serif;font-size:12px;color:var(--tertiary)}
.ld-secure svg{color:var(--secondary)}

.ld-showcase{position:relative;max-width:880px;margin:44px auto 0;perspective:1200px}
.ld-showcase-card{position:relative;border-radius:16px;padding:8px;background:linear-gradient(to bottom,var(--surface-high),var(--surface-container));box-shadow:0 25px 50px -12px rgba(0,74,198,0.18);animation:ldHeroFloat 7s ease-in-out infinite;will-change:transform;transition:transform .3s ease-out;transform-style:preserve-3d}
.ld-screen{position:relative;width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:var(--surface-lowest);box-shadow:inset 0 1px 3px rgba(0,0,0,0.06)}
.ld-img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;transform:scale(1.008);transition:transform .7s ease}
.ld-screen:hover .ld-img{transform:scale(1.03)}
.ld-fallback{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--surface-high),var(--surface-container) 50%,var(--surface-highest));color:var(--primary);font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:18px}
.ld-sweep{position:absolute;top:-75%;left:0;width:40%;height:250%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent);mix-blend-mode:overlay;pointer-events:none;z-index:20;animation:ldSweep 6.5s cubic-bezier(0.4,0,0.2,1) infinite}
.ld-hot{position:absolute;transform:translate(-50%,-50%);z-index:20;pointer-events:none}
.ld-hot-ring{position:absolute;left:-16px;top:-16px;width:32px;height:32px;border-radius:999px;background:rgba(37,99,235,0.3);animation:ldPulse 2.4s cubic-bezier(0.2,0.8,0.4,1) infinite}
.ld-hot-dot{position:relative;display:block;width:10px;height:10px;border-radius:999px;background:#ffffff;box-shadow:0 0 10px #2563eb}
.ld-badge{position:absolute;z-index:20;display:flex;align-items:center;gap:10px;border-radius:12px;background:var(--glass-card);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.7);box-shadow:0 12px 28px rgba(11,28,48,0.12);text-align:left}
.ld-b-margem{top:24px;left:24px;display:none;padding:10px 14px;animation:ldLevA 5s ease-in-out infinite -1.5s}
.ld-b-lucro{bottom:24px;right:24px;padding:12px 14px;animation:ldLevB 6s ease-in-out infinite -3s}
.ld-b-fipe{bottom:24px;left:24px;display:none;padding:8px 12px;border-radius:10px;animation:ldLevA 5.5s ease-in-out infinite -0.8s}
.ld-b-live{top:16px;right:24px;display:none;align-items:center;gap:8px;padding:4px 12px;border-radius:999px;animation:ldLevA 5.5s ease-in-out infinite -0.8s}
@media (min-width:640px){.ld-b-margem{display:flex}}
@media (min-width:768px){.ld-b-fipe,.ld-b-live{display:flex}}
.ld-ic-verde{width:36px;height:36px;border-radius:9px;background:rgba(108,248,187,0.5);display:flex;align-items:center;justify-content:center;color:#002113}
.ld-ic-azul{width:40px;height:40px;border-radius:9px;background:var(--surface-high);display:flex;align-items:center;justify-content:center;color:var(--primary)}
.ld-k{font-family:Inter,sans-serif;font-size:11px;color:var(--on-variant);font-weight:500}
.ld-v{font-family:'Plus Jakarta Sans',sans-serif;font-size:17px;font-weight:700;color:var(--secondary);line-height:1.1}
.ld-tag{padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:var(--secondary-container);color:#00714d}
.ld-sync{width:8px;height:8px;border-radius:999px;background:var(--secondary);position:relative}
.ld-sync::after{content:"";position:absolute;inset:0;border-radius:999px;background:var(--secondary);animation:ldPing 1.6s cubic-bezier(0,0,0.2,1) infinite}
.ld-live-txt{font-family:Inter,sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--on-variant)}
.ld-spark{width:48px;height:14px;stroke:var(--primary);fill:none;stroke-dasharray:60;animation:ldSpark 3.5s ease-in-out infinite}

.ld-section{position:relative;max-width:1200px;margin:0 auto;padding:28px 24px;z-index:1}
.ld-features{display:grid;gap:20px;grid-template-columns:1fr}
@media (min-width:768px){.ld-features{grid-template-columns:repeat(2,1fr)}}
@media (min-width:1024px){.ld-features{grid-template-columns:repeat(4,1fr)}}
.ld-wrap-f{animation:ldCardFloat 5.5s ease-in-out infinite}
.ld-f2{animation-duration:5.8s;animation-delay:.2s}
.ld-f3{animation-duration:5.4s;animation-delay:.4s}
.ld-f4{animation-duration:6s;animation-delay:.6s}
.ld-card{height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:24px;border-radius:16px;background:var(--surface-lowest);border:1px solid transparent;box-shadow:0 2px 8px rgba(15,23,42,0.04),0 12px 24px -6px rgba(15,23,42,0.06);transition:all .3s ease-out;cursor:default}
.ld-card:hover{transform:translateY(-8px);border-color:rgba(37,99,235,0.25);box-shadow:0 20px 35px -8px rgba(37,99,235,0.2),0 0 20px rgba(37,99,235,0.08)}
.ld-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:8px}
.ld-ico{width:48px;height:48px;border-radius:12px;background:var(--surface-container);color:var(--primary);display:flex;align-items:center;justify-content:center;transition:all .3s ease-out}
.ld-card:hover .ld-ico{background:var(--primary-c);color:#ffffff;transform:scale(1.1);box-shadow:0 4px 12px rgba(37,99,235,0.25)}
.ld-tagc{padding:4px 10px;border-radius:6px;font-family:Inter,sans-serif;font-size:11px;font-weight:600;background:var(--surface-low);color:var(--primary);text-align:right;transition:background .3s}
.ld-card:hover .ld-tagc{background:rgba(37,99,235,0.1)}
.ld-card h2{margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.01em;color:var(--on-surface);transition:color .2s}
.ld-card:hover h2{color:var(--primary)}
.ld-card p{margin:10px 0 0;font-size:14px;line-height:1.6;color:var(--on-variant)}
.ld-cardfoot{margin-top:22px;padding-top:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--primary);font-family:Inter,sans-serif;font-size:13px;font-weight:600}
.ld-cardfoot svg{transition:transform .3s ease;flex-shrink:0}
.ld-card:hover .ld-cardfoot svg{transform:translateX(6px)}

.ld-calc{border-radius:16px;background:var(--surface-lowest);padding:28px;box-shadow:0 4px 20px rgba(15,23,42,0.05);border:1px solid var(--surface-high);margin-top:24px}
@media (min-width:768px){.ld-calc{padding:36px}}
.ld-calc-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:18px;padding-bottom:22px;border-bottom:1px solid var(--surface-container)}
.ld-kicker{display:flex;align-items:center;gap:8px;font-family:Inter,sans-serif;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--primary)}
.ld-calc h3{margin:6px 0 0;display:flex;align-items:center;gap:8px;font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.015em;color:var(--on-surface)}
.ld-calc-r{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.ld-toggle{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px;font-family:Inter,sans-serif;font-size:12px;font-weight:600;background:var(--surface-low);color:var(--primary);border:1px solid rgba(37,99,235,0.25);cursor:pointer;transition:all .3s}
.ld-toggle:hover{transform:translateY(-1px);box-shadow:0 4px 10px rgba(37,99,235,0.12)}
.ld-toggle.off{color:var(--on-variant);border-color:var(--outline-variant);background:transparent}
.ld-formula{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;background:var(--surface-high);font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:var(--on-surface);border:1px solid rgba(37,99,235,0.25)}
.ld-calc-grid{display:grid;gap:24px;padding-top:24px;grid-template-columns:1fr;align-items:center}
@media (min-width:1024px){.ld-calc-grid{grid-template-columns:1fr 1fr 1fr}}
.ld-ctrl{display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:12px;background:rgba(239,244,255,0.4);border:1px solid var(--surface-container);transition:border-color .2s}
.ld-ctrl:hover{border-color:rgba(37,99,235,0.3)}
.ld-ctrl-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ld-ctrl-name{font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:var(--on-surface)}
.ld-ctrl-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.015em;color:var(--primary);font-variant-numeric:tabular-nums}
.ld-ctrl-foot{display:flex;justify-content:space-between;gap:8px;font-family:Inter,sans-serif;font-size:11px;color:var(--tertiary)}
.ld-range{width:100%;height:8px;border-radius:999px;appearance:none;-webkit-appearance:none;background:transparent;cursor:pointer;margin:6px 0}
.ld-range::-webkit-slider-runnable-track{height:8px;border-radius:999px;background:var(--surface-container)}
.ld-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;height:20px;width:20px;border-radius:50%;background:var(--primary);border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,74,198,0.35);margin-top:-6px;transition:transform .15s ease,box-shadow .15s ease}
.ld-range:hover::-webkit-slider-thumb,.ld-range:focus::-webkit-slider-thumb{transform:scale(1.2);box-shadow:0 0 0 4px rgba(37,99,235,0.2)}
.ld-range::-moz-range-track{height:8px;border-radius:999px;background:var(--surface-container)}
.ld-range::-moz-range-thumb{height:20px;width:20px;border-radius:50%;background:var(--primary);border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,74,198,0.35)}
.ld-out{padding:22px;border-radius:12px;background:linear-gradient(135deg,var(--surface-low),var(--surface-container) 50%,var(--surface-high));border:1px solid rgba(255,255,255,0.6);display:flex;flex-direction:column;justify-content:space-between;gap:14px;box-shadow:0 1px 2px rgba(0,0,0,0.04)}
.ld-out-k{display:flex;align-items:center;justify-content:space-between;font-family:Inter,sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--secondary)}
.ld-out-v{font-family:'Plus Jakarta Sans',sans-serif;font-size:32px;font-weight:800;letter-spacing:-0.03em;color:var(--secondary);line-height:1;font-variant-numeric:tabular-nums}
.ld-out-m{font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:var(--on-variant);margin-top:6px}
.ld-bar{height:10px;border-radius:999px;background:var(--surface-highest);padding:2px;overflow:hidden}
.ld-bar>div{height:100%;border-radius:999px;background:var(--secondary);transition:width .15s ease-out}
.ld-out-f{display:flex;justify-content:space-between;gap:8px;font-family:Inter,sans-serif;font-size:11px;color:var(--tertiary)}
.ld-out-f b{color:var(--secondary);font-weight:600}

.ld-steps-box{border-radius:16px;background:var(--surface-lowest);padding:32px;box-shadow:0 2px 12px rgba(15,23,42,0.04)}
@media (min-width:768px){.ld-steps-box{padding:40px}}
.ld-steps-box h3{margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.015em;color:var(--on-surface)}
.ld-steps-box>p{margin:6px 0 0;font-size:14px;color:var(--on-variant)}
.ld-steps{display:grid;gap:28px;margin-top:28px;grid-template-columns:1fr}
@media (min-width:768px){.ld-steps{grid-template-columns:repeat(3,1fr)}}
.ld-step{display:flex;align-items:flex-start;gap:14px}
.ld-chip{flex-shrink:0;width:36px;height:36px;border-radius:999px;background:var(--surface-container);color:var(--on-surface);font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
.ld-step h4{margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:17px;font-weight:600;color:var(--on-surface)}
.ld-step p{margin:4px 0 0;font-size:14px;line-height:1.6;color:var(--on-variant)}

.ld-banner{border-radius:16px;background:var(--surface-lowest);padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:20px;box-shadow:0 2px 8px rgba(15,23,42,0.03);transition:box-shadow .3s}
@media (min-width:768px){.ld-banner{flex-direction:row;padding:28px 32px}}
.ld-banner:hover{box-shadow:0 8px 20px rgba(15,23,42,0.06)}
.ld-banner-l{display:flex;align-items:center;gap:16px;text-align:left}
.ld-banner-ic{width:48px;height:48px;border-radius:12px;background:var(--surface-high);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--on-surface)}
.ld-banner p{margin:0;font-size:15px;font-weight:500;line-height:1.6;color:var(--on-surface)}
.ld-btn-sec{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:12px;background:var(--primary-c);color:#ffffff;font-family:Inter,sans-serif;font-size:13px;font-weight:600;letter-spacing:.02em;text-decoration:none;box-shadow:0 8px 16px -4px rgba(37,99,235,0.35);transition:all .2s ease}
.ld-btn-sec:hover{background:var(--primary);transform:translateY(-2px)}

.ld-footer{margin-top:40px;padding:28px clamp(16px,4vw,40px);background:var(--surface-low);border-top:1px solid rgba(195,198,215,0.3);display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:space-between;text-align:center}
@media (min-width:768px){.ld-footer{flex-direction:row;text-align:left}}
.ld-footer p{margin:0;font-family:Inter,sans-serif;font-size:12px;color:var(--on-variant);max-width:620px}
.ld-footer a{display:inline-flex;align-items:center;gap:6px;font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:var(--primary);text-decoration:none;transition:color .2s}
.ld-footer a:hover{color:var(--primary-c)}

.cc-pill-ativo{color:var(--primary);border-color:rgba(37,99,235,0.35);background:var(--surface-container)}
.ld-navlink{background:none;border:none;padding:4px 0;font-family:Inter,sans-serif;font-size:14px;font-weight:500;color:var(--on-variant);cursor:pointer;transition:color .2s;text-decoration:none}
.ld-navlink:hover{color:var(--on-surface)}
.ld-navlink.ativo{color:var(--primary);font-weight:700}
.ld-navmain{display:flex;align-items:center;gap:10px}
.ld-logo-img{height:32px;width:auto;display:block}
.ld-entrar-txt{display:inline}
@media (max-width:640px){
  .ld-navmain{gap:6px}
  .ld-logo-img{height:26px}
  .ld-entrar{width:38px;height:38px;padding:0;justify-content:center;border-radius:12px}
  .ld-entrar-txt{display:none}
}
.cc-header-in{gap:8px}
.ld-brand{font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:17px;letter-spacing:-0.02em;color:var(--on-surface);text-decoration:none;display:flex;align-items:center}
.ld-entrar{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:12px;background:var(--primary-c);color:#ffffff;font-family:Inter,sans-serif;font-size:13px;font-weight:600;text-decoration:none;box-shadow:0 8px 16px -4px rgba(37,99,235,0.35);transition:all .2s}
.ld-entrar:hover{background:var(--primary);transform:translateY(-1px)}
.ld-cta-arrow-link{display:inline-flex;align-items:center;gap:6px}

@keyframes ldBlink{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes ldHeroFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-8px) rotate(0.4deg)}}
@keyframes ldSweep{0%{transform:translateX(-120%) rotate(25deg);opacity:0}20%{opacity:.75}60%{opacity:.75}100%{transform:translateX(320%) rotate(25deg);opacity:0}}
@keyframes ldPulse{0%{transform:scale(0.6);opacity:.9}70%{opacity:.4}100%{transform:scale(2.3);opacity:0}}
@keyframes ldPing{0%{transform:scale(1);opacity:.75}75%,100%{transform:scale(2.2);opacity:0}}
@keyframes ldLevA{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.02)}}
@keyframes ldLevB{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.015)}}
@keyframes ldCardFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes ldSpark{0%,100%{stroke-dashoffset:0}50%{stroke-dashoffset:24}}
@media (prefers-reduced-motion: reduce){
  .ld-sweep,.ld-hot-ring,.ld-showcase-card,.ld-wrap-f,.ld-b-margem,.ld-b-lucro,.ld-b-fipe,.ld-b-live,.ld-spark,.ld-sync::after{animation:none !important}
  .ld-card:hover,.ld-cta:hover{transform:none !important}
}
`;

/** Calculadora ilustrativa: loop automático de cenários; pausa quando o usuário mexe. */
function CalculadoraIlustrativa() {
  const [valores, setValores] = useState({ compra: CENARIOS[0].compra, custos: CENARIOS[0].custos });
  const [auto, setAuto] = useState(true);
  const estado = useRef({
    compra: CENARIOS[0].compra, custos: CENARIOS[0].custos,
    de: [CENARIOS[0].compra, CENARIOS[0].custos], para: [CENARIOS[0].compra, CENARIOS[0].custos],
    idx: 0, ultimo: 0, pausado: false, timer: null, auto: true, chaveRender: "",
  });

  useEffect(() => {
    const s = estado.current;
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) return undefined;
    s.ultimo = performance.now();
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let frame;
    const loop = (agora) => {
      if (s.auto && !s.pausado) {
        if (agora - s.ultimo >= PASSO_MS) {
          s.ultimo = agora;
          s.de = [s.compra, s.custos];
          s.idx = (s.idx + 1) % CENARIOS.length;
          s.para = [CENARIOS[s.idx].compra, CENARIOS[s.idx].custos];
        }
        const p = Math.min((agora - s.ultimo) / TRANSICAO_MS, 1);
        const e = easeInOut(p);
        s.compra = s.de[0] + (s.para[0] - s.de[0]) * e;
        s.custos = s.de[1] + (s.para[1] - s.de[1]) * e;
        const chave = `${Math.round(s.compra)}|${Math.round(s.custos)}`;
        if (chave !== s.chaveRender) {
          s.chaveRender = chave;
          setValores({ compra: Math.round(s.compra), custos: Math.round(s.custos) });
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const ref = s;
    return () => { cancelAnimationFrame(frame); clearTimeout(ref.timer); };
  }, []);

  const manual = (campo) => (e) => {
    const s = estado.current;
    s[campo] = Number(e.target.value);
    s.pausado = true;
    clearTimeout(s.timer);
    const compra = Math.round(s.compra), custos = Math.round(s.custos);
    s.chaveRender = `${compra}|${custos}`;
    setValores({ compra, custos });
    s.timer = setTimeout(() => {
      s.pausado = false;
      s.de = [s.compra, s.custos];
      s.ultimo = performance.now();
    }, RETOMAR_MS);
  };

  const alternarAuto = () => {
    const s = estado.current;
    s.auto = !s.auto;
    setAuto(s.auto);
    if (s.auto) {
      s.pausado = false;
      s.de = [s.compra, s.custos];
      s.ultimo = performance.now();
    }
  };

  const venda = valores.compra * 1.23 + 2200;
  const sobra = venda - (valores.compra + valores.custos);
  const margem = (sobra / venda) * 100;
  const barra = Math.min(Math.max((margem / 25) * 100, 10), 100);
  const selo = margem >= 18 ? "Excelente Retorno" : margem >= 14 ? "Acima da Média de Mercado" : "Margem Padrão Consolidada";
  const brl = (v) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

  return (
    <div className="ld-calc">
      <div className="ld-calc-top">
        <div>
          <div className="ld-kicker">
            <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }} aria-hidden="true">
              <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: "var(--primary)", opacity: .75, animation: "ldPing 1.6s cubic-bezier(0,0,0.2,1) infinite" }} />
              <span style={{ position: "relative", width: 8, height: 8, borderRadius: 999, background: "var(--primary)" }} />
            </span>
            o preço real da sua operação a um click.
          </div>
          <h3>Margem Líquida em Tempo Real <Zap size={18} color="var(--primary)" aria-hidden="true" /></h3>
        </div>
        <div className="ld-calc-r">
          <button type="button" className={`ld-toggle${auto ? "" : " off"}`} onClick={alternarAuto} aria-pressed={auto}
            title="Pausar ou retomar a simulação automática">
            {auto ? <PauseCircle size={15} aria-hidden="true" /> : <PlayCircle size={15} aria-hidden="true" />}
            {auto ? "Simulação Automática" : "Pausado (Manual)"}
          </button>
          <span className="ld-formula"><Calculator size={15} aria-hidden="true" />AQUISIÇÃO X CUSTOS = MARGEM REAL</span>
        </div>
      </div>

      <div className="ld-calc-grid">
        <div className="ld-ctrl">
          <div className="ld-ctrl-row">
            <span className="ld-ctrl-name">Valor de Compra</span>
            <span className="ld-ctrl-val">{brl(valores.compra)}</span>
          </div>
          <input type="range" className="ld-range" min={45000} max={110000} step={500} value={valores.compra}
            onChange={manual("compra")} aria-label="Valor de compra" />
          <div className="ld-ctrl-foot"><span>Média FIPE: R$ 74.500</span><span>Min: 45k | Max: 110k</span></div>
        </div>

        <div className="ld-ctrl">
          <div className="ld-ctrl-row">
            <span className="ld-ctrl-name">Custos e Revisões</span>
            <span className="ld-ctrl-val" style={{ color: "var(--tertiary)" }}>{brl(valores.custos)}</span>
          </div>
          <input type="range" className="ld-range" min={1000} max={8500} step={100} value={valores.custos}
            onChange={manual("custos")} aria-label="Custos e revisões" />
          <div className="ld-ctrl-foot"><span>Inclui laudo cautelar e higienização</span><span>Min: 1k | Max: 8.5k</span></div>
        </div>

        <div className="ld-out">
          <div className="ld-out-k">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--secondary)" }} aria-hidden="true" />
              Sobra Líquida Estimada
            </span>
            <WalletCards size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="ld-out-v">{brl(sobra)}</div>
            <div className="ld-out-m">Margem Operacional de {margem.toFixed(1).replace(".", ",")}%</div>
          </div>
          <div>
            <div className="ld-bar"><div style={{ width: `${barra.toFixed(1)}%` }} /></div>
            <div className="ld-out-f" style={{ marginTop: 8 }}>
              <span>Lucro seguro na ponta</span>
              <b>{selo}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const paleta = "light";
  const logoCustom = marca.logo_landing_claro || null;
  const [digitado, setDigitado] = useState("");
  const [imgOk, setImgOk] = useState(true);
  const [ativo, setAtivo] = useState("solucoes");
  const heroRef = useRef(null);
  const cardRef = useRef(null);

  // Digitação do título (uma vez)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDigitado(TEXTO_HERO); return undefined; }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setDigitado(TEXTO_HERO.slice(0, i));
      if (i >= TEXTO_HERO.length) clearInterval(t);
    }, 50);
    return () => clearInterval(t);
  }, []);

  // Inclinação da vitrine com o mouse
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const area = heroRef.current;
    const card = cardRef.current;
    if (!area || !card) return undefined;
    const mover = (e) => {
      const b = area.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width - 0.5;
      const y = (e.clientY - b.top) / b.height - 0.5;
      card.style.transform = `perspective(1000px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-4px)`;
    };
    const sair = () => { card.style.transform = ""; };
    area.addEventListener("mousemove", mover);
    area.addEventListener("mouseleave", sair);
    return () => {
      area.removeEventListener("mousemove", mover);
      area.removeEventListener("mouseleave", sair);
    };
  }, []);

  const irPara = (id) => (e) => {
    e.preventDefault();
    setAtivo(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const digitando = digitado.length < TEXTO_HERO.length;

  return (
    <PageTransition>
      <div className="cc-page" data-paleta={paleta}>
        <style>{CSS}</style>

        <header className="cc-header">
          <div className="cc-header-in">
            <Link to="/" className="ld-brand" aria-label="Calcula.car, página inicial">
              {logoCustom
                ? <img className="ld-logo-img" src={logoCustom} alt="Logomarca" />
                : <span>CALCULA.car</span>}
            </Link>

            <nav className="ld-navmain" aria-label="Seções">
              {[
                { id: "solucoes", texto: "SOLUÇÕES", Icone: Lightbulb },
                { id: "modulos", texto: "MÓDULOS", Icone: LayoutGrid },
                { id: "como-funciona", texto: "COMO FUNCIONA", Icone: ListOrdered },
              ].map(({ id, texto, Icone }) => (
                <a key={id} href={`#${id}`} onClick={irPara(id)} aria-label={texto}
                  className={`cc-pill${ativo === id ? " cc-pill-ativo" : ""}`}>
                  <Icone size={16} aria-hidden="true" /><span className="cc-pill-txt">{texto}</span>
                </a>
              ))}
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link to="/login" className="ld-entrar" aria-label="Entrar"><LogIn size={15} aria-hidden="true" /><span className="ld-entrar-txt">Entrar</span></Link>
            </div>
          </div>
        </header>

        <main className="ld-main">
          <div className="ld-glow" aria-hidden="true" style={{ top: 40, left: "50%", transform: "translateX(-50%)", width: 720, height: 360, background: "var(--glow)" }} />
          <div className="ld-glow" aria-hidden="true" style={{ top: 380, right: 40, width: 420, height: 280, background: "rgba(108,248,187,0.25)", filter: "blur(90px)" }} />

          <section id="solucoes" className="ld-hero ld-anchor" aria-labelledby="ld-titulo">
            <div className="ld-eyebrow"><span className="ld-dot" aria-hidden="true" />Gestão para lojas de veículos</div>
            <h1 id="ld-titulo" className="ld-h1" aria-label="Saiba quanto sobra de VERDADE em cada compra e venda de veículo.">
              {digitado}
              <span className="ld-cursor" aria-hidden="true" style={{ opacity: digitando ? 1 : 0 }}>|</span>
            </h1>

            <div className="ld-ctarow">
              <Link to="/login" className="ld-cta">Entrar <ArrowRight size={18} className="ld-arrow" aria-hidden="true" /></Link>
              <span className="ld-secure"><ShieldCheck size={15} aria-hidden="true" />Acesso corporativo seguro e criptografado</span>
            </div>

            <div className="ld-showcase" ref={heroRef}>
              <div className="ld-showcase-card" ref={cardRef}>
                <div className="ld-screen">
                  {imgOk ? (
                    <img className="ld-img" src={IMAGEM_HERO} alt="Painel do Calcula.car com análise de margens, FIPE e estoque"
                      onError={() => setImgOk(false)} />
                  ) : (
                    <div className="ld-fallback" role="img" aria-label="Painel do Calcula.car">Calcula.car · Painel de margens</div>
                  )}
                  <div className="ld-sweep" aria-hidden="true" />

                  <div className="ld-hot" style={{ top: "38%", left: "48%" }} aria-hidden="true">
                    <span className="ld-hot-ring" />
                    <span className="ld-hot-dot" />
                  </div>
                  <div className="ld-hot" style={{ top: "67%", left: "62%" }} aria-hidden="true">
                    <span className="ld-hot-ring" style={{ background: "rgba(56,189,248,0.35)", animationDelay: "-1.2s" }} />
                    <span style={{ position: "relative", display: "block", width: 8, height: 8, borderRadius: 999, background: "#bae6fd", boxShadow: "0 0 12px #38bdf8" }} />
                  </div>

                  <div className="ld-badge ld-b-live">
                    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
                      <span className="ld-sync" />
                    </span>
                    <span className="ld-live-txt">● AO VIVO</span>
                    <span style={{ color: "var(--on-variant)", opacity: .4 }}>|</span>
                    <svg className="ld-spark" viewBox="0 0 48 14" aria-hidden="true">
                      <path d="M1 8L9 4L16 10L24 2L32 9L40 5L47 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    </svg>
                  </div>

                  <div className="ld-badge ld-b-margem">
                    <div className="ld-ic-verde"><TrendingUp size={18} aria-hidden="true" /></div>
                    <div>
                      <p className="ld-k" style={{ margin: 0 }}>Margem Real Líquida</p>
                      <p className="ld-v" style={{ margin: 0 }}>+18.4% <span className="ld-k" style={{ fontWeight: 400 }}>médio</span></p>
                    </div>
                  </div>

                  <div className="ld-badge ld-b-lucro">
                    <div className="ld-ic-azul"><Banknote size={20} aria-hidden="true" /></div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 17, fontWeight: 800, color: "var(--on-surface)" }}>+R$ 14.850</span>
                        <span className="ld-tag">Por Carro</span>
                      </div>
                      <p className="ld-k" style={{ margin: "2px 0 0" }}>Lucro consolidado na ponta da venda</p>
                    </div>
                  </div>

                  <div className="ld-badge ld-b-fipe">
                    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}><span className="ld-sync" /></span>
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 600, color: "var(--on-surface)" }}>Tabela FIPE vs. Custo Real Atualizado</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="modulos" className="ld-section ld-anchor" aria-labelledby="ld-modulos-titulo">
            <h2 id="ld-modulos-titulo" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Módulos do sistema</h2>
            <div className="ld-features">
              {RECURSOS.map(({ icon: Icon, tag, titulo, texto, rodape, classe }) => (
                <div key={titulo} className={`ld-wrap-f ${classe}`}>
                  <div className="ld-card">
                    <div>
                      <div className="ld-card-top">
                        <div className="ld-ico"><Icon size={24} aria-hidden="true" /></div>
                        <span className="ld-tagc">{tag}</span>
                      </div>
                      <h3 style={{ margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--on-surface)" }}>{titulo}</h3>
                      <p>{texto}</p>
                    </div>
                    <div className="ld-cardfoot">
                      <span>{rodape}</span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <CalculadoraIlustrativa />
          </section>

          <section id="como-funciona" className="ld-section ld-anchor" aria-labelledby="ld-como-titulo">
            <div className="ld-steps-box">
              <h3 id="ld-como-titulo">Como funciona?</h3>
              <p>Três etapas simples para blindar a rentabilidade do seu pátio de seminovos.</p>
              <div className="ld-steps">
                {PASSOS.map((p) => (
                  <div key={p.n} className="ld-step">
                    <div className="ld-chip">{p.n}</div>
                    <div>
                      <h4>{p.titulo}</h4>
                      <p>{p.texto}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="ld-section" style={{ paddingTop: 16, paddingBottom: 40 }} aria-label="Cadastro">
            <div className="ld-banner">
              <div className="ld-banner-l">
                <div className="ld-banner-ic"><Users size={22} aria-hidden="true" /></div>
                <p>Ainda não usa o Calcula.car? Cadastre-se agora mesmo, clicando no link.</p>
              </div>
              <a href={CADASTRO_WHATSAPP} target="_blank" rel="noopener noreferrer" className="ld-btn-sec">
                Cadastre-se AQUI! <ExternalLink size={16} aria-hidden="true" />
              </a>
            </div>
          </section>
        </main>

        <footer className="ld-footer">
          <p>© {new Date().getFullYear()} Calcula.car. Todos os direitos reservados. Gestão de Alta Performance para Lojas de Veículos.</p>
          <a href={SUPORTE_WHATSAPP} target="_blank" rel="noopener noreferrer">
            <Headset size={16} aria-hidden="true" /> Suporte Especializado <WhatsAppIcon size={15} />
          </a>
        </footer>
      </div>
    </PageTransition>
  );
}
