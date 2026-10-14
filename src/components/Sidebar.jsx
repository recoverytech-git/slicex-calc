import { NavLink, useNavigate } from "react-router-dom";
import { LogIn, LogOut } from "lucide-react";
import { NAV_PRINCIPAL } from "./navItems";
import { useAuth } from "../lib/auth";
import logo from "../assets/logo.png";

export default function Sidebar() {
  const { sessao, sair, supabaseConfigurado } = useAuth();
  const navigate = useNavigate();

  const onSair = async () => {
    await sair();
    navigate("/", { replace: true });
  };

  return (
    <aside className="sidebar" aria-label="Navegação principal">
      <div className="sidebar-brand">
        <img src={logo} alt="SliceX.calc" style={{ height: 26, width: "auto" }} />
      </div>
      <nav className="sidebar-nav">
        {NAV_PRINCIPAL.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => `sidebar-link${isActive ? " ativo" : ""}`}>
            <Icon size={17} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        {supabaseConfigurado && (sessao ? (
          <button className="sidebar-link" onClick={onSair}><LogOut size={17} /> Sair</button>
        ) : (
          <NavLink to="/login" className="sidebar-link"><LogIn size={17} /> Entrar</NavLink>
        ))}
      </div>
    </aside>
  );
}
