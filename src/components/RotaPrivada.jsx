import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

/** Bloqueia rotas que exigem login. A autorização real é feita pelo RLS no banco. */
export default function RotaPrivada({ children }) {
  const { sessao, perfil, carregando, supabaseConfigurado } = useAuth();
  const local = useLocation();
  if (!supabaseConfigurado) return <Navigate to="/" replace />;
  if (carregando) return null;
  if (!sessao) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  if (perfil && perfil.ativo === false) return <Navigate to="/login" replace />;
  return children;
}
