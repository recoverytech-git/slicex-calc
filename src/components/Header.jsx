import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "../assets/logo.png";
import { useMarca } from "../lib/marca";

export default function Header({ subtitle }) {
  const marca = useMarca();
  return (
    <div
      style={{
        background: "#000000",
        padding: "18px 24px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <motion.img
          src={marca.logo_header || logo}
          alt="SliceX.calc"
          style={{ height: 38, width: "auto", display: "block" }}
          whileHover={{ scale: 1.04 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
        <div style={{ borderLeft: "1px solid var(--border-strong)", paddingLeft: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            Calculadoras Financeiras
          </div>
          <div style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 2 }}>
            {subtitle || "Ferramentas para decisões mais inteligentes"}
          </div>
        </div>
      </Link>
    </div>
  );
}
