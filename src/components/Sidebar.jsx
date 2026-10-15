import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Users } from "lucide-react";
import { NAV_PRINCIPAL } from "./navItems";
import { useAuth } from "../lib/auth";
import logo from "../assets/logo.png";

export default function Sidebar() {
  const { sair, perfil } = useAuth();
  const navigate = useNavigate();
  const podeGerirUsuarios = ["admin_master", "proprietario"].includes(perfil?.papel);
  const itens = podeGerirUsuarios
    ? [...NAV_PRINCIPAL, { to: "/admin/usuarios", label: "Usuários", icon: Users }]
    : NAV_PRINCIPAL;

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
        {itens.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/app"} className={({ isActive }) => `sidebar-link${isActive ? " ativo" : ""}`}>
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
