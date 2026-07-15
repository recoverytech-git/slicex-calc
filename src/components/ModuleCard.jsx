import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export default function ModuleCard({ to, icon: Icon, title, description, tag, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={to} style={{ display: "block", height: "100%" }}>
        <motion.div
          whileHover={{ y: -6, borderColor: "rgba(255,255,255,.4)" }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: "100%",
            background: "linear-gradient(160deg, #161616 0%, #101010 100%)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            cursor: "pointer",
            boxShadow: "var(--shadow-md)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 46, height: 46, borderRadius: "var(--r-md)",
              background: "var(--surface-3)", border: "1px solid var(--border-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon size={22} strokeWidth={1.75} color="var(--text)" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{title}</h3>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>{description}</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            {tag && (
              <span
                style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
                  color: "var(--text-mute)", background: "var(--surface-2)",
                  padding: "4px 9px", borderRadius: 999, border: "1px solid var(--border)",
                }}
              >
                {tag}
              </span>
            )}
            <ArrowUpRight size={18} color="var(--text-mute)" style={{ marginLeft: "auto" }} />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
