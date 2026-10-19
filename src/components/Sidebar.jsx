import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { LogOut, Lock, ChevronDown } from "lucide-react";
import { itensNav } from "./navItems";
import { useAuth } from "../lib/auth";
import { useMarca } from "../lib/marca";
import logo from "../assets/logo.png";

const ROTAS_CALCULADORAS = ["/financiamento", "/percentual", "/amortizacao"];

export default function Sidebar({ aberta = true }) {
  const { sair, perfil } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const marca = useMarca();
  const [calcAberto, setCalcAberto] = useState(() => ROTAS_CALCULADORAS.some((r) => pathname.startsWith(r)));
  const logoSidebar = marca.logo_sidebar || logo;
  const itens = itensNav(perfil?.papel);

  // Vai para a landing antes de encerrar a sessão, para não cair no login
  const onSair = async () => {
    navigate("/", { replace: true });
    await sair();
  };

  const linkStyle = { textDecoration: "none" };

  return (
    <aside className={`sidebar${aberta ? "" : " fechada"}`} aria-label="Navegação principal">
      <div className="sidebar-brand">
        <img src={logoSidebar} alt="SliceX.calc" style={{ height: 26, width: "auto" }} />
      </div>
      <nav className="sidebar-nav">
        {itens.map((item) => {
          const { to, label, icon: Icon, bloqueado, tipo, id } = item;
          if (item.grupo) return null; // filhos do grupo são renderizados dentro dele

          if (tipo === "grupo") {
            const filhos = itens.filter((c) => c.grupo === id);
            return (
              <div key={id}>
                <button type="button" className="sidebar-link" onClick={() => setCalcAberto((v) => !v)}
                  aria-expanded={calcAberto} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <Icon size={17} /> {label}
                  <ChevronDown size={15} style={{ marginLeft: "auto", transform: calcAberto ? "rotate(180deg)" : "none", transition: "transform .25s ease" }} />
                </button>
                {calcAberto && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 14, marginTop: 4 }}>
                    {filhos.map((c) => (
                      <NavLink key={c.to} to={c.to} className={({ isActive }) => `sidebar-link${isActive ? " ativo" : ""}`} style={linkStyle}>
                        <c.icon size={16} /> {c.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (bloqueado) return (
            <div key={to} className="sidebar-link" aria-disabled="true" title="Disponível apenas para o administrador" style={{ opacity: 0.5, cursor: "not-allowed" }}>
              <Icon size={17} /> {label} <Lock size={13} style={{ marginLeft: "auto" }} />
            </div>
          );

          return (
            <NavLink key={to} to={to} end={to === "/dashboard"} className={({ isActive }) => `sidebar-link${isActive ? " ativo" : ""}`} style={linkStyle}>
              <Icon size={17} /> {label}
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <button className="sidebar-link" onClick={onSair}><LogOut size={17} /> Sair</button>
      </div>
    </aside>
  );
}
