import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { itensNav } from "./navItems";
import { useAuth } from "../lib/auth";
import logo from "../assets/logo.png";
import { useMarca } from "../lib/marca";

export default function Sidebar({ aberta = true }) {
  const { sair, perfil } = useAuth();
  const navigate = useNavigate();
  const marca = useMarca();
  const itens = itensNav(perfil?.papel);

  // Navega para a landing ANTES de encerrar a sessão, para que a rota privada
  // atual não redirecione para /login durante o logout.
  const onSair = async () => {
    navigate("/", { replace: true });
    await sair();
  };

  return (
    <aside className={`sidebar${aberta ? "" : " fechada"}`} aria-label="Navegação principal">
      <div className="sidebar-brand">
        <img src={marca.logo_sidebar || logo} alt="SliceX.calc" style={{ height: 26, width: "auto" }} />
      </div>
      <nav className="sidebar-nav">
        {itens.map(({ to, label, icon: Icon }) => (
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
