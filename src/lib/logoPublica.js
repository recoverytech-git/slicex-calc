import { useEffect, useState } from 'react';
import logoPadrao from '../assets/logo.png';

// Logo oficial (configuracoes) para as paginas publicas; sem ela, usa o logotipo padrao
let cache = null;
let pendente = null;
function carregar() {
  if (cache !== null) return Promise.resolve(cache);
  if (!pendente) {
    pendente = fetch('/api/marca')
      .then((r) => (r.ok ? r.json() : {}))
      .then((b) => { cache = b.logo_claro || logoPadrao; return cache; })
      .catch(() => { cache = logoPadrao; return cache; });
  }
  return pendente;
}
export default function useLogoPublica() {
  const [src, setSrc] = useState(cache ?? logoPadrao);
  useEffect(() => { carregar().then(setSrc); }, []);
  return src;
}
