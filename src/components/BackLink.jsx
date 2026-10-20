import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function BackLink() {
  return (
    <motion.div whileHover={{ x: -3 }} transition={{ duration: 0.15 }} style={{ display: "inline-block", marginTop: 16 }}>
      <Link
        to="/dashboard"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, height: 38, padding: "0 14px",
          borderRadius: 12, border: "1px solid var(--border-strong)", background: "var(--surface)",
          color: "var(--text)", fontSize: 13, fontWeight: 600, textDecoration: "none",
          boxShadow: "0 1px 3px rgba(11,28,48,0.06)",
        }}
      >
        <ArrowLeft size={16} aria-hidden="true" /> Voltar para todas as calculadoras
      </Link>
    </motion.div>
  );
}
