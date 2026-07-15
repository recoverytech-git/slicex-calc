export default function Field({ label, val, set, hint, onChange, suffix }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          value={val}
          onChange={(e) => {
            set(e.target.value);
            onChange && onChange();
          }}
          placeholder={hint}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "var(--surface)",
            border: "1.5px solid var(--border-strong)",
            borderRadius: "var(--r-sm)",
            padding: suffix ? "11px 40px 11px 13px" : "11px 13px",
            color: "var(--text)",
            fontSize: 15,
            fontWeight: 600,
            outline: "none",
            transition: `border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease)`,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--border-focus)";
            e.target.style.background = "var(--surface-2)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border-strong)";
            e.target.style.background = "var(--surface)";
          }}
        />
        {suffix && (
          <span
            style={{
              position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: "var(--text-mute)", pointerEvents: "none", fontWeight: 600,
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
