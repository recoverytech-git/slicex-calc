import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { itensNav } from "./navItems";
import { useAuth } from "../lib/auth";

export default function BottomNav() {
  const { sair, perfil } = useAuth();
  const navigate = useNavigate();
  const onSair = async () => {
    navigate("/", { replace: true });
    await sair();
  };
  return (
    <nav className="bottomnav" aria-label="Navegação">
      {itensNav(perfil?.papel).map(({ to, curto, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === "/app"} className={({ isActive }) => `bottomnav-link${isActive ? " ativo" : ""}`}>
          <Icon size={20} />
          <span>{curto}</span>
        </NavLink>
      ))}
      <button type="button" onClick={onSair} className="bottomnav-link" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        <LogOut size={20} />
        <span>Sair</span>
      </button>
    </nav>
  );
}
