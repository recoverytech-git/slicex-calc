import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Lock } from "lucide-react";
import { itensNav } from "./navItems";
import { useAuth } from "../lib/auth";
import { useMarca } from "../lib/marca";
import { useTema } from "../lib/tema";
import logo from "../assets/logo.png";

export default function Sidebar({ aberta = true }) {
  const { sair, perfil } = useAuth();
  const navigate = useNavigate();
  const marca = useMarca();
  const [tema] = useTema();
  const logoSidebar = tema === "light" ? (marca.logo_sidebar_claro || logo) : (marca.logo_sidebar || logo);
  const itens = itensNav(perfil?.papel);

  // Vai para a landing antes de encerrar a sessão, para não cair no login
  const onSair = async () => {
    navigate("/", { replace: true });
    await sair();
  };

  return (
    <aside className={`sidebar${aberta ? "" : " fechada"}`} aria-label="Navegação principal">
      <div className="sidebar-brand">
        <img src={logoSidebar} alt="SliceX.calc" style={{ height: 26, width: "auto" }} />
      </div>
      <nav className="sidebar-nav">
        {itens.map(({ to, label, icon: Icon, bloqueado }) => bloqueado ? (
          <div key={to} className="sidebar-link" aria-disabled="true" title="Disponível apenas para o administrador" style={{ opacity: 0.5, cursor: "not-allowed" }}>
            <Icon size={17} /> {label} <Lock size={13} style={{ marginLeft: "auto" }} />
          </div>
        ) : (
          <NavLink key={to} to={to} end={to === "/dashboard"} className={({ isActive }) => `sidebar-link${isActive ? " ativo" : ""}`}>
            <Icon size={17} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <button className="sidebar-link" onClick={onSair}><LogOut size={17} /> Sair</button>
      </div>
    </aside>
  );
}
