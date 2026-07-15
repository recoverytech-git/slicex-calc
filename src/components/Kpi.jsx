import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";

export default function Kpi({ label, value, format, icon, color = "var(--text)", index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: 14,
        textAlign: "center",
      }}
    >
      {icon && <div style={{ fontSize: 20 }}>{icon}</div>}
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color }}>
        <AnimatedNumber value={value} format={format} />
      </div>
    </motion.div>
  );
}
