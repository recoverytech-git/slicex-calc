import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../lib/auth";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" };

export default function Login() {
  const { entrar, recuperarSenha, supabaseConfigurado, sessao } = useAuth();
  const navigate = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState("entrar"); // entrar | recuperar
  const [msg, setMsg] = useState(null);
  const [carregando, setCarregando] = useState(false);

  if (sessao) return <Navigate to="/app" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setMsg(null); setCarregando(true);
    try {
      if (modo === "recuperar") {
        const { error } = await recuperarSenha(email);
        setMsg(error ? { tipo: "erro", texto: "Não foi possível enviar o e-mail. Verifique o endereço." }
                     : { tipo: "ok", texto: "Se o e-mail estiver cadastrado, você receberá o link de recuperação." });
      } else {
        const { error } = await entrar(email, senha);
        if (error) setMsg({ tipo: "erro", texto: "E-mail ou senha incorretos." });
        else navigate(local.state?.de || "/app", { replace: true });
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Falha de conexão. Tente novamente." });
    } finally { setCarregando(false); }
  };

  return (
    <PageTransition>
      <div className="page-bg">
        <Header subtitle="Acesso restrito" />
        <div className="container" style={{ paddingTop: 40, maxWidth: 420 }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, padding: 24, boxShadow: "var(--shadow-md)" }}>
            <h1 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
              {modo === "entrar" ? "Entrar" : "Recuperar senha"}
            </h1>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-dim)" }}>
              {modo === "entrar" ? "Use o e-mail e a senha cadastrados pela loja." : "Informe seu e-mail para receber o link."}
            </p>

            {!supabaseConfigurado && (
              <div style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", fontSize: 12, color: "var(--text-dim)", marginBottom: 14 }}>
                Acesso indisponível: a conexão com o banco ainda não está configurada.
              </div>
            )}

            <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="E-mail" val={email} set={setEmail} hint="voce@loja.com.br" />
              {modo === "entrar" && <Field label="Senha" val={senha} set={setSenha} hint="••••••••" />}
              <PrimaryButton type="submit" disabled={carregando || !supabaseConfigurado || !email} style={{ width: "100%" }}>
                {carregando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Enviar link"}
              </PrimaryButton>
            </form>

            {msg && (
              <div role="status" style={{ marginTop: 14, padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600,
                background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: msg.tipo === "erro" ? "var(--text)" : "var(--text-dim)" }}>
                {msg.texto}
              </div>
            )}

            <button onClick={() => { setModo(modo === "entrar" ? "recuperar" : "entrar"); setMsg(null); }}
              style={{ marginTop: 16, background: "none", border: "none", color: "var(--text-dim)", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
              {modo === "entrar" ? "Esqueci minha senha" : "Voltar ao login"}
            </button>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
