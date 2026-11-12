import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

// Botao padrao de retorno: pilula branca com circulo azul e seta, alinhado a esquerda
export default function BackLink() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", margin: "16px 0 8px" }}>
      <motion.div whileHover={{ x: -3 }} transition={{ duration: 0.15 }} style={{ display: "inline-block" }}>
        <Link
          to="/dashboard"
          style={{
            display: "inline-flex", alignItems: "center", gap: 10, height: 42, padding: "0 18px 0 6px",
            borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--text)", fontSize: 13, fontWeight: 600, textDecoration: "none",
            boxShadow: "0 2px 8px rgba(11,28,48,0.08)",
          }}
        >
          <span style={{ width: 30, height: 30, borderRadius: 999, background: "#eef4ff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
            <ArrowLeft size={16} aria-hidden="true" />
          </span>
          Voltar para todas as calculadoras
        </Link>
      </motion.div>
    </div>
  );
}
