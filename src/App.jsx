import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Login from "./pages/Login";
import RotaPrivada from "./components/RotaPrivada";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import { AuthProvider, useAuth } from "./lib/auth";

const Financiamento = lazy(() => import("./pages/Financiamento"));
const Percentual = lazy(() => import("./pages/Percentual"));
const Amortizacao = lazy(() => import("./pages/Amortizacao"));
const CalculaCar = lazy(() => import("./pages/CalculaCar"));
const Estoque = lazy(() => import("./pages/Estoque"));
const AdminUsuarios = lazy(() => import("./pages/AdminUsuarios"));

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
          <Route path="/app" element={<RotaPrivada><Home /></RotaPrivada>} />
          <Route path="/financiamento" element={<RotaPrivada><Financiamento /></RotaPrivada>} />
          <Route path="/percentual" element={<RotaPrivada><Percentual /></RotaPrivada>} />
          <Route path="/amortizacao" element={<RotaPrivada><Amortizacao /></RotaPrivada>} />
          <Route path="/calcula-car" element={<RotaPrivada><CalculaCar /></RotaPrivada>} />
          <Route path="/estoque" element={<RotaPrivada><Estoque /></RotaPrivada>} />
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
  const publico = pathname === "/" || pathname === "/login";
  const comNav = Boolean(sessao) && !publico;
  return (
    <div className={`app-shell${comNav ? " com-nav" : ""}`}>
      {comNav && <Sidebar />}
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
