import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function BackLink() {
  return (
    <motion.div whileHover={{ x: -3 }} transition={{ duration: 0.15 }} style={{ display: "inline-block" }}>
      <Link
        to="/"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "var(--text-dim)", fontWeight: 600, marginTop: 20,
        }}
      >
        <ArrowLeft size={15} /> Todas as calculadoras
      </Link>
    </motion.div>
  );
}
