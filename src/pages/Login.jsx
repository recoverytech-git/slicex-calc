// sem-rascunho: credenciais de acesso não são guardadas no navegador
import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck, HelpCircle, Sun, Moon, Loader2 } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../lib/auth";
import { useMarca } from "../lib/marca";
import { useTema } from "../lib/tema";
import { ENTRADA } from "../lib/motion";
import logo from "../assets/logo.png";

const SUPORTE_WHATSAPP = "https://wa.me/5561991432700?text=Preciso%20de%20ajuda%20para%20acessar%20a%20plataforma%20CALCULA.CAR%20";

const rotuloStyle = { display: "block", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" };

function Campo({ id, rotulo, acao, icone: Icone, tipo = "text", valor, onChange, placeholder, autoComplete, direita }) {
  const [foco, setFoco] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <label htmlFor={id} style={rotuloStyle}>{rotulo}</label>
        {acao}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Icone size={18} aria-hidden="true" style={{ position: "absolute", left: 14, pointerEvents: "none", color: foco ? "var(--accent)" : "var(--text-mute)", transition: "color .2s ease" }} />
        <input id={id} type={tipo} value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
          onFocus={() => setFoco(true)} onBlur={() => setFoco(false)}
          style={{ width: "100%", boxSizing: "border-box", padding: direita ? "14px 46px 14px 44px" : "14px 14px 14px 44px", borderRadius: 12,
            border: `1.5px solid ${foco ? "var(--accent)" : "var(--border-strong)"}`, background: "var(--surface-2)", color: "var(--text)",
            fontSize: 15, fontWeight: 500, outline: "none", boxShadow: foco ? "0 0 0 3px rgba(68,147,248,0.18)" : "none",
            transition: "border-color .2s ease, box-shadow .2s ease" }} />
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
  const [tema, definirTema] = useTema();
  const claro = tema === "light";
  const logoLogin = claro ? (marca.logo_landing_claro || logo) : (marca.logo_landing || logo);
  const logoPadrao = logoLogin === logo;

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [modo, setModo] = useState("entrar"); // entrar | recuperar
  const [msg, setMsg] = useState(null);
  const [carregando, setCarregando] = useState(false);

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
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-top)" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px clamp(16px, 4vw, 40px)", background: "var(--bg-header)", borderBottom: "1px solid var(--border)" }}>
          <img src={logoLogin} alt="Logomarca" style={{ height: 34, width: "auto", filter: claro && logoPadrao ? "invert(1)" : "none" }} />
          <nav style={{ display: "flex", alignItems: "center", gap: 22, marginLeft: "auto" }}>
            <Link to="/" className="login-link"><ArrowLeft size={16} aria-hidden="true" /><span className="login-link-texto">Home page</span></Link>
            <a href={SUPORTE_WHATSAPP} target="_blank" rel="noopener noreferrer" className="login-link">
              <HelpCircle size={16} aria-hidden="true" /><span className="login-link-texto">Ajuda &amp; Suporte</span>
            </a>
          </nav>
          <button type="button" onClick={() => definirTema(claro ? "dark" : "light")} aria-label={claro ? "Ativar tema escuro" : "Ativar tema claro"}
            style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {claro ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </header>

        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px",
          background: "radial-gradient(ellipse 800px 520px at 50% 35%, rgba(68,147,248,0.14), transparent 70%)" }}>
          <div style={{ width: "100%", maxWidth: 440 }}>
            <motion.div {...ENTRADA} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
              <div style={{ padding: "28px 28px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: "rgba(68,147,248,0.12)", color: "var(--accent-soft)", fontSize: 12, fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--accent)" }} aria-hidden="true" /> Login seguro
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text-mute)" }}>
                    <Lock size={13} aria-hidden="true" /> ACESSO RESTRITO
                  </span>
                </div>

                <h1 style={{ margin: "22px 0 6px", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)" }}>
                  {modo === "entrar" ? "Entrar" : "Recuperar senha"}
                </h1>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--text-dim)" }}>
                  {modo === "entrar"
                    ? "Use o e-mail e a senha cadastrados pela sua loja parceira para gerenciar margens e estoque."
                    : "Informe seu e-mail corporativo e enviaremos o link para criar uma nova senha."}
                </p>

                {!supabaseConfigurado && (
                  <div role="status" style={{ marginTop: 16, padding: "10px 14px", borderRadius: "var(--r-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", fontSize: 12, color: "var(--text-dim)" }}>
                    Acesso indisponível: a conexão com o banco ainda não está configurada.
                  </div>
                )}

                <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 24 }}>
                  <Campo id="email" rotulo="E-mail corporativo" icone={Mail} tipo="email" valor={email} onChange={setEmail}
                    placeholder="voce@loja.com.br" autoComplete="username" />

                  {modo === "entrar" && (
                    <Campo id="senha" rotulo="Senha" icone={Lock} tipo={verSenha ? "text" : "password"} valor={senha} onChange={setSenha}
                      placeholder="Sua senha" autoComplete="current-password"
                      acao={
                        <button type="button" onClick={() => trocarModo("recuperar")}
                          style={{ background: "none", border: "none", padding: 0, color: "var(--accent-soft)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Esqueci minha senha
                        </button>
                      }
                      direita={
                        <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                          style={{ position: "absolute", right: 10, padding: 6, borderRadius: 8, border: "none", background: "transparent", color: "var(--text-mute)", cursor: "pointer", display: "flex" }}>
                          {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      } />
                  )}

                  <button type="submit" disabled={!podeEnviar} className="login-botao"
                    style={{ width: "100%", padding: "15px 20px", borderRadius: 12, border: "none", color: "#ffffff", fontSize: 15, fontWeight: 700,
                      background: "linear-gradient(90deg, #2F6FD6, #4493F8)", boxShadow: "0 10px 24px -8px rgba(68,147,248,0.55)",
                      cursor: podeEnviar ? "pointer" : "not-allowed", opacity: podeEnviar ? 1 : 0.6,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    {carregando ? <><Loader2 size={18} className="spin" aria-hidden="true" /> Aguarde…</>
                      : modo === "entrar" ? <>Entrar na plataforma <ArrowRight size={18} aria-hidden="true" /></>
                      : <>Enviar link de recuperação <ArrowRight size={18} aria-hidden="true" /></>}
                  </button>
                </form>

                {msg && (
                  <div role="status" style={{ marginTop: 16, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 600,
                    background: "var(--bg-elevated)", border: `1px solid ${msg.tipo === "erro" ? "#ef4444" : "var(--border-strong)"}`, color: "var(--text)" }}>
                    {msg.texto}
                  </div>
                )}

                {modo === "recuperar" && (
                  <button type="button" onClick={() => trocarModo("entrar")}
                    style={{ marginTop: 18, background: "none", border: "none", padding: 0, color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ArrowLeft size={14} aria-hidden="true" /> Voltar ao login
                  </button>
                )}
              </div>

              <div style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border)", padding: "18px 28px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
                  Não possui credenciais? <strong style={{ color: "var(--text)" }}>Solicite à diretoria da loja.</strong>
                </p>
                <p style={{ margin: "10px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "var(--text-mute)" }}>
                  <ShieldCheck size={14} aria-hidden="true" style={{ color: "var(--accent)" }} /> Conexão criptografada
                </p>
              </div>
            </motion.div>
          </div>
        </main>

        <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "18px clamp(16px, 4vw, 40px)", borderTop: "1px solid var(--border)", background: "var(--surface-2)", fontSize: 12, color: "var(--text-mute)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={14} aria-hidden="true" /> Ambiente seguro para acesso à plataforma
          </span>
          <span>© {new Date().getFullYear()} Todos os direitos reservados.</span>
        </footer>
      </div>
    </PageTransition>
  );
}
