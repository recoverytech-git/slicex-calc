import { Suspense, lazy, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import RotaPrivada from "./components/RotaPrivada";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import { AuthProvider, useAuth } from "./lib/auth";
import { useMarca } from "./lib/marca";

const Financiamento = lazy(() => import("./pages/Financiamento"));
const Percentual = lazy(() => import("./pages/Percentual"));
const Amortizacao = lazy(() => import("./pages/Amortizacao"));
const CalculaCar = lazy(() => import("./pages/CalculaCar"));
const Estoque = lazy(() => import("./pages/Estoque"));
const AdminUsuarios = lazy(() => import("./pages/AdminUsuarios"));
const VeiculoDetalhe = lazy(() => import("./pages/VeiculoDetalhe"));
const Vendas = lazy(() => import("./pages/Vendas"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Logs = lazy(() => import("./pages/Logs"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

function RouteFallback() {
  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c8c8c", fontFamily: "system-ui, sans-serif", fontSize: 14 }}>
      Carregando…
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<RotaPrivada><Dashboard /></RotaPrivada>} />
          <Route path="/app" element={<Navigate to="/dashboard" replace />} />
          <Route path="/painel" element={<Navigate to="/dashboard" replace />} />
          <Route path="/financiamento" element={<RotaPrivada><Financiamento /></RotaPrivada>} />
          <Route path="/percentual" element={<RotaPrivada><Percentual /></RotaPrivada>} />
          <Route path="/amortizacao" element={<RotaPrivada><Amortizacao /></RotaPrivada>} />
          <Route path="/calcula-car" element={<RotaPrivada><CalculaCar /></RotaPrivada>} />
          <Route path="/estoque" element={<RotaPrivada><Estoque /></RotaPrivada>} />
          <Route path="/estoque/:id" element={<RotaPrivada><VeiculoDetalhe /></RotaPrivada>} />
          <Route path="/configuracoes" element={<RotaPrivada papeis={["admin_master"]}><Configuracoes /></RotaPrivada>} />
          <Route path="/logs" element={<RotaPrivada papeis={["admin_master"]}><Logs /></RotaPrivada>} />
          <Route path="/vendas" element={<RotaPrivada papeis={["admin_master","proprietario","gerente"]}><Vendas /></RotaPrivada>} />
          <Route path="/admin/usuarios" element={<RotaPrivada><AdminUsuarios /></RotaPrivada>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function Shell() {
  const { pathname } = useLocation();
  const { sessao } = useAuth();
  const [menuAberto, setMenuAberto] = useState(true);
  const marca = useMarca();
  useEffect(() => {
    if (!marca.favicon) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = marca.favicon;
  }, [marca.favicon]);
  const publico = pathname === "/" || pathname === "/login";
  const comNav = Boolean(sessao) && !publico;
  const classes = ["app-shell", comNav && "com-nav", comNav && !menuAberto && "menu-fechado"].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {comNav && <Sidebar aberta={menuAberto} />}
      {comNav && (
        <button type="button" className="menu-toggle" onClick={() => setMenuAberto((v) => !v)}
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"} aria-expanded={menuAberto}
          style={{ left: menuAberto ? 232 : 0 }}>
          {menuAberto ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      )}
      <div className="app-main">
        <AnimatedRoutes />
      </div>
      {comNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
