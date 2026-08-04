import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * Modal genérico — segue os mesmos tokens visuais (var(--surface),
 * var(--border), var(--shadow-lg)) já usados em todos os cards da
 * aplicação. Fecha ao clicar fora ou no X.
 */
export default function Modal({ open, onClose, title, children, footer }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480, maxHeight: "88vh",
              background: "var(--surface)", border: "1px solid var(--border-strong)",
              borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-lg)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
            }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{title}</h2>
              <button
                onClick={onClose}
                aria-label="Fechar"
                style={{
                  background: "var(--surface-2)", border: "1px solid var(--border-strong)",
                  borderRadius: "var(--r-sm)", width: 30, height: 30,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "var(--text-dim)", flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: "auto" }}>{children}</div>

            {footer && (
              <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
