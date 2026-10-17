import { ENTRADA } from "../lib/motion";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Landmark, Car, Warehouse, ShieldCheck, Users, ArrowRight, LogIn } from "lucide-react";
import PageTransition from "../components/PageTransition";
import logo from "../assets/logo.png";
import { useAuth } from "../lib/auth";
import { useTema } from "../lib/tema";
import { Sun, Moon } from "lucide-react";

const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 22 };

const RECURSOS = [
  { icon: Landmark, titulo: "Financiamento e amortização", texto: "Simule Price ou SAC, veja a evolução da dívida e descubra se vale mais reduzir o prazo ou a parcela após um aporte." },
  { icon: Car, titulo: "Calcula-Car", texto: "Compare o valor FIPE com a compra, some custos como documentação e revisão e veja o resultado líquido da operação." },
  { icon: Warehouse, titulo: "Estoque", texto: "Cadastre veículos com fotos, busque por placa, RENAVAM ou chassi e exporte o estoque em PDF." },
  { icon: ShieldCheck, titulo: "Acesso por perfil", texto: "Administrador, lojista, gerente e vendedor veem apenas o que cada função precisa." },
];

const PASSOS = [
  "Entre com o acesso fornecido pela sua loja.",
  "Cadastre o veículo com dados, custos e fotos.",
  "Analise a operação e acompanhe o estoque.",
];

export default function Landing() {
  const { sessao } = useAuth();
  const [tema, definirTema] = useTema();
  const claro = tema === "light";
  const destino = sessao ? "/dashboard" : "/login";
  const rotulo = sessao ? "Acessar o sistema" : "Entrar";

  return (
    <PageTransition>
      <div className="page-bg" style={{ paddingBottom: 40 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-header)" }}>
          <img src={logo} alt="SliceX.calc" style={{ height: 30, width: "auto" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={() => definirTema(claro ? "dark" : "light")} aria-label="Alternar tema"
            style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {claro ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <Link to={destino} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: "var(--r-sm)", background: "var(--accent)", color: "var(--accent-ink)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            <LogIn size={15} /> {rotulo}
          </Link>
                  </div>
        </header>

        <div className="container" style={{ maxWidth: 1040, paddingTop: 56 }}>
          <motion.section {...ENTRADA} style={{ textAlign: "center" }}>
            <p style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-mute)", margin: "0 0 14px", fontWeight: 700 }}>
              Gestão para lojas de veículos
            </p>
            <h1 style={{ fontSize: 40, lineHeight: 1.15, margin: "0 0 16px", fontWeight: 800, color: "var(--text)" }}>
              Saiba quanto sobra em cada compra e venda de veículo
            </h1>
            <p style={{ fontSize: 16, color: "var(--text-dim)", maxWidth: 640, margin: "0 auto 28px", lineHeight: 1.6 }}>
              O SliceX.calc calcula a margem real da operação, financiamento incluído, e organiza o estoque da sua loja com fotos, custos e permissões por função.
            </p>
            <Link to={destino} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 24px", borderRadius: "var(--r-sm)", background: "var(--accent)", color: "var(--accent-ink)", fontWeight: 800, fontSize: 15, textDecoration: "none" }}>
              {rotulo} <ArrowRight size={17} />
            </Link>
          </motion.section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16, marginTop: 56 }}>
            {RECURSOS.map(({ icon: Icon, titulo, texto }, i) => (
              <motion.div key={titulo} {...ENTRADA} style={card}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", background: "var(--surface-3)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon size={18} color="var(--text)" />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{titulo}</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>{texto}</p>
              </motion.div>
            ))}
          </section>

          <section style={{ ...card, marginTop: 40, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Como funciona</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 18 }}>
              {PASSOS.map((p, i) => (
                <div key={p} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ width: 28, height: 28, borderRadius: 999, background: "var(--surface-3)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "var(--text)", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>{p}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ ...card, marginTop: 24, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <Users size={20} color="var(--text)" />
            <p style={{ margin: 0, flex: 1, minWidth: 220, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>
              Não tem acesso? Peça à administração da sua loja. Os usuários são criados pela equipe responsável pelo sistema.
            </p>
            <Link to="/login" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", textDecoration: "underline" }}>Já tenho acesso</Link>
          </section>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginTop: 40 }}>
            SliceX.calc · Simulações são estimativas e não substituem avaliação profissional
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
