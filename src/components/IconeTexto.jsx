/** Texto com ícone gráfico (substitui emojis na interface). */
export default function IconeTexto({ icon: Icon, children, cor }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: cor }}>
      <Icon size={14} />
      {children}
    </span>
  );
}
