import { NavLink } from "react-router-dom";
import { NAV_PRINCIPAL } from "./navItems";

export default function BottomNav() {
  return (
    <nav className="bottomnav" aria-label="Navegação">
      {NAV_PRINCIPAL.map(({ to, curto, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === "/"}
          className={({ isActive }) => `bottomnav-link${isActive ? " ativo" : ""}`}>
          <Icon size={20} />
          <span>{curto}</span>
        </NavLink>
      ))}
    </nav>
  );
}
