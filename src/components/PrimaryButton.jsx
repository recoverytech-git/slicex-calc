import { motion } from "framer-motion";

export default function PrimaryButton({ children, onClick, disabled, style, type = "button" }) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -1, boxShadow: "0 6px 20px rgba(255,255,255,.18)" }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      style={{
        border: "none",
        borderRadius: "var(--r-sm)",
        fontSize: 15,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? "var(--surface-3)" : "var(--accent)",
        color: disabled ? "var(--text-faint)" : "var(--accent-ink)",
        padding: "13px 20px",
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}
