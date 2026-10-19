// sem-rascunho: credenciais de acesso não são guardadas no navegador
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Home, Loader2, TrendingUp, Gauge, ShieldCheck, BadgeCheck, BarChart3, Check } from "lucide-react";
import PageTransition from "../components/PageTransition";
import WhatsAppIcon from "../components/WhatsAppIcon";
import { CC_BASE_CSS } from "../components/ccPaleta";
import { useAuth } from "../lib/auth";
import { useMarca } from "../lib/marca";
import { SUPORTE_WHATSAPP } from "../lib/contato";

const CSS = `
${CC_BASE_CSS}
.lg-main{position:relative;z-index:10;min-height:100vh;padding:64px 16px 0;display:flex;flex-direction:column}
.lg-stage{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 0 36px}
.lg-glow-a{pointer-events:none;position:absolute;top:-80px;left:50%;width:640px;max-width:140vw;height:420px;transform:translateX(-50%);background:linear-gradient(to top right,rgba(37,99,235,0.15),rgba(37,99,235,0.2),rgba(108,248,187,0.15));filter:blur(64px);opacity:.75;border-radius:999px;animation:lgAmbient1 7s ease-in-out infinite alternate}
.lg-glow-b{pointer-events:none;position:absolute;bottom:-40px;right:40px;width:340px;height:340px;background:var(--primary-fixed);opacity:.3;filter:blur(64px);border-radius:999px;animation:lgAmbient2 8s ease-in-out infinite alternate 1s}
.lg-float{position:absolute;z-index:10;display:none;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--surface-lowest);opacity:.95;border:1px solid var(--surface-container);box-shadow:0 12px 28px -8px rgba(0,74,198,0.14),0 2px 6px rgba(0,0,0,0.04);transition:transform .3s,box-shadow .3s}
.lg-float:hover{transform:scale(1.04)}
.lg-float-l{left:40px;top:96px;animation:lgFloat1 5.5s ease-in-out infinite}
.lg-float-r{right:40px;bottom:64px;animation:lgFloat2 6s ease-in-out infinite .6s}
@media (min-width:1440px){.lg-float{display:flex}}
.lg-float-ic{width:32px;height:32px;border-radius:10px;background:var(--surface-low);display:flex;align-items:center;justify-content:center;color:var(--primary)}
.lg-float-r .lg-float-ic{color:var(--secondary)}
.lg-float-k{display:flex;align-items:center;gap:6px;font-family:Inter,sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--on-variant)}
.lg-badge{display:inline-flex;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;background:var(--secondary-fixed);color:var(--on-secondary-fixed)}
.lg-float-v{margin:2px 0 0;font-size:13px;font-weight:700;color:var(--on-surface)}
.lg-wrap{position:relative;width:100%;max-width:400px;z-index:20}
.lg-enter{animation:lgFadeUp .75s cubic-bezier(.16,1,.3,1) both}
.lg-card{position:relative;border-radius:20px;background:var(--surface-lowest);opacity:.97;box-shadow:var(--card-shadow),0 0 0 1px rgba(255,255,255,0.08);padding:26px;display:flex;flex-direction:column;transition:transform .25s ease-out,box-shadow .3s ease;will-change:transform}
@media (min-width:640px){.lg-card{padding:32px}}
.lg-card:hover{box-shadow:0 26px 60px -10px rgba(0,74,198,0.2),0 10px 24px rgba(11,28,48,0.06)}
.lg-topline{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:10px}
.lg-pill-status{display:inline-flex;align-items:center;gap:7px;padding:4px 10px;border-radius:999px;background:var(--surface-low);color:var(--primary);font-family:Inter,sans-serif;font-size:11px;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,0.05)}
.lg-pill-dot{width:7px;height:7px;border-radius:999px;background:var(--primary);animation:lgBlink 2s ease-in-out infinite}
.lg-restrito{display:inline-flex;align-items:center;gap:5px;font-family:Inter,sans-serif;font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--on-variant)}
.lg-restrito svg{color:var(--secondary)}
.lg-h1{margin:0 0 6px;font-family:'Plus Jakarta Sans',sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.025em;line-height:1.15;color:var(--on-surface)}
.lg-sub{margin:0 0 22px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;line-height:1.55;color:var(--on-variant)}
.lg-form{display:flex;flex-direction:column;gap:15px}
.lg-field{display:flex;flex-direction:column;gap:6px}
.lg-label-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.lg-label{font-family:Inter,sans-serif;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--on-surface);transition:color .2s}
.lg-field:focus-within .lg-label{color:var(--primary)}
.lg-link{background:none;border:none;padding:0;font-family:Inter,sans-serif;font-size:11px;font-weight:600;color:var(--primary);cursor:pointer;transition:color .2s}
.lg-link:hover{color:var(--primary-c);text-decoration:underline}
.lg-input-wrap{position:relative;display:flex;align-items:center}
.lg-icon{position:absolute;left:13px;color:var(--on-variant);pointer-events:none;transition:color .2s}
.lg-field:focus-within .lg-icon{color:var(--primary)}
.lg-input{width:100%;box-sizing:border-box;padding:12px 14px 12px 40px;border-radius:12px;border:1px solid transparent;background:var(--input-bg);color:var(--on-surface);font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:500;outline:none;transition:all .2s ease}
.lg-input::placeholder{color:var(--on-variant);opacity:.6}
.lg-input:hover{border-color:var(--surface-variant)}
.lg-input:focus{background:var(--surface-lowest);border-color:var(--primary-c);box-shadow:0 0 0 4px var(--ring),0 4px 14px rgba(37,99,235,0.12);transform:translateY(-1px)}
.lg-input-pr{padding-right:44px}
.lg-eye{position:absolute;right:8px;padding:5px;border-radius:8px;border:none;background:transparent;color:var(--on-variant);cursor:pointer;display:flex;transition:all .2s}
.lg-eye:hover{color:var(--on-surface);background:var(--surface-container)}
.lg-check-row{display:flex;align-items:center}
.lg-check{position:relative;display:flex;align-items:center;gap:9px;cursor:pointer;user-select:none}
.lg-check input{position:absolute;opacity:0;width:0;height:0;margin:0}
.lg-check-box{width:18px;height:18px;border-radius:5px;background:var(--surface-low);display:flex;align-items:center;justify-content:center;color:#ffffff;transition:all .2s}
.lg-check:hover .lg-check-box{background:var(--surface-container)}
.lg-check input:checked + .lg-check-box{background:var(--primary)}
.lg-check input:focus-visible + .lg-check-box{box-shadow:0 0 0 2px var(--ring)}
.lg-check-box svg{opacity:0;transform:scale(0);transition:all .2s}
.lg-check input:checked + .lg-check-box svg{opacity:1;transform:scale(1)}
.lg-check-txt{font-family:Inter,sans-serif;font-size:11px;font-weight:500;color:var(--on-variant);transition:color .2s}
.lg-check:hover .lg-check-txt{color:var(--on-surface)}
.lg-cta{position:relative;width:100%;margin-top:6px;padding:13px 20px;border-radius:12px;border:none;overflow:hidden;color:#ffffff;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;background:linear-gradient(90deg,var(--primary),var(--primary-c));box-shadow:0 8px 22px -4px rgba(37,99,235,0.45);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s ease}
.lg-cta:hover:not(:disabled){box-shadow:0 14px 28px -4px rgba(37,99,235,0.6);transform:translateY(-2px)}
.lg-cta:active:not(:disabled){transform:translateY(0) scale(0.985)}
.lg-cta:disabled{opacity:.6;cursor:not-allowed}
.lg-shine{position:absolute;top:0;bottom:0;left:0;width:50%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);pointer-events:none;animation:lgShimmer 4s cubic-bezier(0.4,0,0.2,1) infinite}
.lg-cta-txt{position:relative;z-index:1;display:flex;align-items:center;gap:8px}
.lg-cta .lg-arrow{transition:transform .2s}
.lg-cta:hover:not(:disabled) .lg-arrow{transform:translateX(5px)}
.lg-msg{margin-top:14px;padding:9px 12px;border-radius:12px;font-family:Inter,sans-serif;font-size:12px;font-weight:600;background:var(--surface-low);color:var(--on-surface);border:1px solid var(--surface-container)}
.lg-msg-erro{border-color:#ef4444}
.lg-voltar{margin-top:14px;background:none;border:none;padding:0;display:inline-flex;align-items:center;gap:6px;font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:var(--on-variant);cursor:pointer}
.lg-voltar:hover{color:var(--on-surface)}
.lg-foot{margin:24px -26px -26px;padding:18px 26px;border-radius:0 0 20px 20px;background:var(--surface-low);display:flex;flex-direction:column;gap:8px;text-align:center}
@media (min-width:640px){.lg-foot{margin:24px -32px -32px;padding:18px 32px}}
.lg-foot p{margin:0;font-family:Inter,sans-serif;font-size:11px;color:var(--on-variant)}
.lg-foot-link{color:var(--primary);font-weight:700;text-decoration:none;transition:color .2s}
.lg-foot-link:hover{color:var(--primary-c);text-decoration:underline}
.lg-foot-sec{display:flex;align-items:center;justify-content:center;gap:6px;opacity:.85}
.lg-foot-sec svg{color:var(--secondary)}
.lg-live{margin-top:16px;display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:14px;background:var(--live-bg);border:1px solid var(--surface-container);font-family:Inter,sans-serif;font-size:11px;font-weight:500;color:var(--on-variant)}
.lg-live-l{display:flex;align-items:center;gap:9px}
.lg-ping{position:relative;width:9px;height:9px;display:inline-block}
.lg-ping::before{content:"";position:absolute;inset:0;border-radius:999px;background:var(--secondary-c);opacity:.75;animation:lgPing 1.6s cubic-bezier(0,0,0.2,1) infinite}
.lg-ping::after{content:"";position:absolute;inset:0;border-radius:999px;background:var(--secondary);animation:lgGreen 2.2s infinite}
.lg-live-r{color:var(--primary);display:flex}
.lg-footer{position:relative;z-index:10;margin-top:auto;padding:16px clamp(16px,4vw,40px);background:var(--surface-low);border-top:1px solid var(--surface-container);display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;font-family:Inter,sans-serif;font-size:11px;color:var(--on-variant)}
.lg-footer-l{display:flex;align-items:center;gap:7px}
.lg-footer-l svg{color:var(--secondary)}
.lg-footer-r{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
@keyframes lgFloat1{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-8px) rotate(0.4deg)}}
@keyframes lgFloat2{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(8px) rotate(-0.5deg)}}
@keyframes lgAmbient1{0%,100%{transform:translate(-50%,0) scale(1);opacity:.7}50%{transform:translate(-50%,-12px) scale(1.08);opacity:.9}}
@keyframes lgAmbient2{0%,100%{transform:scale(1) translate(0,0);opacity:.25}50%{transform:scale(1.15) translate(-12px,-8px);opacity:.45}}
@keyframes lgFadeUp{from{opacity:0;transform:translateY(22px) scale(0.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes lgShimmer{0%{transform:translateX(-150%) skewX(-20deg)}100%{transform:translateX(250%) skewX(-20deg)}}
@keyframes lgPing{0%{transform:scale(1);opacity:.75}75%,100%{transform:scale(2.2);opacity:0}}
@keyframes lgGreen{0%{box-shadow:0 0 0 0 rgba(0,108,73,0.5)}70%{box-shadow:0 0 0 6px rgba(0,108,73,0)}100%{box-shadow:0 0 0 0 rgba(0,108,73,0)}}
@keyframes lgBlink{0%,100%{opacity:1}50%{opacity:.5}}
`;

function Campo({ id, rotulo, acao, Icone, tipo = "text", valor, onChange, placeholder, autoComplete, direita }) {
  return (
    <div className="lg-field">
      <div className="lg-label-row">
        <label htmlFor={id} className="lg-label">{rotulo}</label>
        {acao}
      </div>
      <div className="lg-input-wrap">
        <Icone size={18} className="lg-icon" aria-hidden="true" />
        <input id={id} type={tipo} value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          autoComplete={autoComplete} required className={`lg-input${direita ? " lg-input-pr" : ""}`} />
        {direita}
      </div>
    </div>
  );
}

export default function Login() {
  const { entrar, recuperarSenha, supabaseConfigurado, sessao } = useAuth();
  const navigate = useNavigate();
  const local = useLocation();
  const marca = useMarca();
  const paleta = "light";
  const logoCustom = marca.logo_landing_claro || null;

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [modo, setModo] = useState("entrar");
  const [msg, setMsg] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const wrapRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return undefined;
    const mover = (e) => {
      const b = wrap.getBoundingClientRect();
      const cx = e.clientX - b.left - b.width / 2;
      const cy = e.clientY - b.top - b.height / 2;
      const rx = (-cy / (b.height / 2)) * 4;
      const ry = (cx / (b.width / 2)) * 4;
      card.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(6px)`;
    };
    const sair = () => { card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)"; };
    wrap.addEventListener("mousemove", mover);
    wrap.addEventListener("mouseleave", sair);
    return () => {
      wrap.removeEventListener("mousemove", mover);
      wrap.removeEventListener("mouseleave", sair);
    };
  }, []);

  if (sessao) return <Navigate to="/dashboard" replace />;

  const trocarModo = (novo) => { setModo(novo); setMsg(null); };

  const enviar = async (e) => {
    e.preventDefault();
    setMsg(null);
    setCarregando(true);
    try {
      if (modo === "recuperar") {
        const { error } = await recuperarSenha(email);
        setMsg(error
          ? { tipo: "erro", texto: "Não foi possível enviar o e-mail. Verifique o endereço." }
          : { tipo: "ok", texto: "Se o e-mail estiver cadastrado, você receberá o link de recuperação." });
      } else {
        const { error } = await entrar(email, senha);
        if (error) setMsg({ tipo: "erro", texto: "E-mail ou senha incorretos." });
        else navigate(local.state?.de || "/dashboard", { replace: true });
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Falha de conexão. Tente novamente." });
    } finally {
      setCarregando(false);
    }
  };

  const podeEnviar = !carregando && supabaseConfigurado && email && (modo === "recuperar" || senha);

  return (
    <PageTransition>
      <div className="cc-page" data-paleta={paleta}>
        <style>{CSS}</style>

        <header className="cc-header">
          <div className="cc-header-in">
            <Link to="/" aria-label="Calcula.car, página inicial" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "var(--on-surface)", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>
              {logoCustom
                ? <img src={logoCustom} alt="Logomarca" style={{ height: 32, width: "auto", display: "block" }} />
                : <span>CALCULA<span style={{ color: "var(--primary)" }}>.car</span></span>}
            </Link>
            <nav style={{ display: "flex", alignItems: "center", gap: 10 }} aria-label="Acesso">
              <Link to="/" className="cc-pill" aria-label="Voltar para a página inicial">
                <Home size={16} aria-hidden="true" /><span className="cc-pill-txt">HOME PAGE</span>
              </Link>
              <a href={SUPORTE_WHATSAPP} target="_blank" rel="noopener noreferrer" className="cc-pill cc-pill-wa" aria-label="Ajuda e suporte pelo WhatsApp">
                <WhatsAppIcon size={16} /><span className="cc-pill-txt">AJUDA &amp; SUPORTE</span>
              </a>
            </nav>
            </div>
        </header>

        <main className="lg-main">
          <div className="lg-stage">
            <div className="lg-glow-a" aria-hidden="true" />
            <div className="lg-glow-b" aria-hidden="true" />

            <div className="lg-float lg-float-l" aria-hidden="true">
              <div className="lg-float-ic"><TrendingUp size={18} /></div>
              <div>
                <div className="lg-float-k">Margem líquida <span className="lg-badge">+4,8%</span></div>
                <p className="lg-float-v">R$ 14.850 / veículo</p>
              </div>
            </div>
            <div className="lg-float lg-float-r" aria-hidden="true">
              <div className="lg-float-ic"><Gauge size={18} /></div>
              <div>
                <span className="lg-float-k">Palio 1,0</span>
                <p className="lg-float-v">18 dias em estoque</p>
              </div>
            </div>

            <div className="lg-wrap" ref={wrapRef}>
              <div className="lg-enter">
                <div className="lg-card" ref={cardRef}>
                  <div className="lg-topline">
                    <span className="lg-pill-status"><span className="lg-pill-dot" aria-hidden="true" />Login seguro</span>
                    <span className="lg-restrito"><Lock size={13} aria-hidden="true" />Acesso restrito</span>
                  </div>

                  <h1 className="lg-h1">{modo === "entrar" ? "Entrar" : "Recuperar senha"}</h1>
                  <p className="lg-sub">
                    {modo === "entrar"
                      ? "Use o e-mail e a senha cadastrados pela sua loja parceira para gerenciar margens e estoque."
                      : "Informe seu e-mail corporativo e enviaremos o link para criar uma nova senha."}
                  </p>

                  {!supabaseConfigurado && (
                    <div role="status" className="lg-msg">Acesso indisponível: a conexão com o banco ainda não está configurada.</div>
                  )}

                  <form onSubmit={enviar} className="lg-form">
                    <Campo id="email" rotulo="E-mail corporativo" Icone={Mail} tipo="email" valor={email} onChange={setEmail}
                      placeholder="voce@loja.com.br" autoComplete="username" />

                    {modo === "entrar" && (
                      <Campo id="senha" rotulo="Senha" Icone={Lock} tipo={verSenha ? "text" : "password"} valor={senha} onChange={setSenha}
                        placeholder="••••••••••••" autoComplete="current-password"
                        acao={<button type="button" className="lg-link" onClick={() => trocarModo("recuperar")}>Esqueci minha senha</button>}
                        direita={
                          <button type="button" className="lg-eye" onClick={() => setVerSenha((v) => !v)}
                            aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}>
                            {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        } />
                    )}

                    {modo === "entrar" && (
                      <div className="lg-check-row">
                        <label className="lg-check">
                          <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
                          <span className="lg-check-box"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                          <span className="lg-check-txt">Lembrar deste dispositivo</span>
                        </label>
                      </div>
                    )}

                    <button type="submit" disabled={!podeEnviar} className="lg-cta">
                      <span className="lg-shine" aria-hidden="true" />
                      <span className="lg-cta-txt">
                        {carregando ? <><Loader2 size={17} className="cc-spin" aria-hidden="true" /> Aguarde…</>
                          : modo === "entrar" ? <>Entrar na plataforma <ArrowRight size={17} className="lg-arrow" aria-hidden="true" /></>
                          : <>Enviar link de recuperação <ArrowRight size={17} className="lg-arrow" aria-hidden="true" /></>}
                      </span>
                    </button>
                  </form>

                  {msg && <div role="status" className={`lg-msg${msg.tipo === "erro" ? " lg-msg-erro" : ""}`}>{msg.texto}</div>}

                  {modo === "recuperar" && (
                    <button type="button" className="lg-voltar" onClick={() => trocarModo("entrar")}>
                      <ArrowLeft size={14} aria-hidden="true" /> Voltar ao login
                    </button>
                  )}

                  <div className="lg-foot">
                    <p>
                      Não possui credenciais? Solicite{" "}
                      <a href={SUPORTE_WHATSAPP} target="_blank" rel="noopener noreferrer" className="lg-foot-link">CLICANDO AQUI!</a>
                    </p>
                    <p className="lg-foot-sec"><BadgeCheck size={14} aria-hidden="true" /> Criptografia ponta a ponta ativa • Padrão F&amp;I Bancário</p>
                  </div>
                </div>

                <div className="lg-live">
                  <div className="lg-live-l"><span className="lg-ping" aria-hidden="true" /><span>Servidores Financeiros Online</span></div>
                  <div className="lg-live-r"><BarChart3 size={15} aria-hidden="true" /></div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="lg-footer">
          <div className="lg-footer-l">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Ambiente Seguro com Criptografia de Ponta a Ponta (SSL 256-bit)</span>
          </div>
          <div className="lg-footer-r">
            <span>© {new Date().getFullYear()} Calcula.car Soluções Automotivas. Todos os direitos reservados.</span>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
