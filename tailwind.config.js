/** @type {import('tailwindcss').Config} */
// Tailwind usado somente na rota /calcula-car-novo (escopo .cc-novo, sem preflight: nao altera o restante do sistema)
export default {
  content: ["./src/pages/CalculaCarNovo.jsx"],
  important: ".cc-novo",
  corePlugins: { preflight: false },
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', "Inter", "sans-serif"], mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"] },
      colors: {
        brand: { 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a" },
      },
      boxShadow: {
        "layered": "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 16px 32px -6px rgba(15, 23, 42, 0.06)",
        "layered-hover": "0 2px 4px rgba(15, 23, 42, 0.04), 0 12px 24px -4px rgba(37, 99, 235, 0.08), 0 24px 48px -10px rgba(15, 23, 42, 0.12)",
        "glow-md": "0 8px 30px -4px rgba(37, 99, 235, 0.2)",
        "glow-sm": "0 4px 20px -2px rgba(37, 99, 235, 0.15)",
        "glow-lg": "0 12px 40px -6px rgba(37, 99, 235, 0.25)",
        "card": "0 1px 3px rgba(0,0,0,0.02), 0 10px 25px -5px rgba(15, 23, 42, 0.04)",
        "card-hover": "0 20px 35px -8px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0,0,0,0.02)",
      },
    },
  },
  plugins: [],
};
