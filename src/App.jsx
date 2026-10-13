import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { AuthProvider } from "./lib/auth";

// Code-splitting por rota: cada calculadora só baixa seu próprio código
// (e dependências pesadas, como o xlsx) quando o usuário de fato a visita.
const Financiamento = lazy(() => import("./pages/Financiamento"));
const Percentual = lazy(() => import("./pages/Percentual"));
const Amortizacao = lazy(() => import("./pages/Amortizacao"));
const CalculaCar = lazy(() => import("./pages/CalculaCar"));
const Estoque = lazy(() => import("./pages/Estoque"));

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
          <Route path="/" element={<Home />} />
          <Route path="/financiamento" element={<Financiamento />} />
          <Route path="/percentual" element={<Percentual />} />
          <Route path="/amortizacao" element={<Amortizacao />} />
          <Route path="/calcula-car" element={<CalculaCar />} />
          <Route path="/login" element={<Login />} />
          <Route path="/estoque" element={<RotaPrivada><Estoque /></RotaPrivada>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
