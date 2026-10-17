import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

const card = { background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", padding: 24, maxWidth: 440, margin: "80px auto", textAlign: "center" };

/** Bloqueia rotas sem login. Com `papeis`, também restringe por perfil. */
export default function RotaPrivada({ children, papeis }) {
  const { sessao, perfil, carregando, supabaseConfigurado } = useAuth();
  const local = useLocation();
  if (!supabaseConfigurado) return <Navigate to="/" replace />;
  if (carregando) return null;
  if (!sessao) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  if (perfil === undefined) return null;
  if (perfil === null || perfil.ativo === false) {
    return (
      <div style={card}>
        <h2 style={{ margin: "0 0 8px", color: "var(--text)", fontSize: 18 }}>Acesso pendente</h2>
        <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>
          {perfil === null
            ? "Sua conta ainda não foi liberada. Peça ao administrador para concluir seu cadastro."
            : "Sua conta está suspensa. Fale com o administrador da loja."}
        </p>
      </div>
    );
  }
  if (papeis && !papeis.includes(perfil.papel)) return <Navigate to="/dashboard" replace />;
  return children;
}
