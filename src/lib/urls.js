// Endereco publico do sistema (usado em links enviados a clientes).
// Em previews do Vercel a URL e protegida por login; o link precisa sempre apontar para producao.
export const URL_PUBLICA = import.meta.env.VITE_APP_URL || "https://slicex-calc.vercel.app";
