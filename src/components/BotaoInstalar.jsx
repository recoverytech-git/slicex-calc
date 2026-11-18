import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// Botao "Instalar app": um toque no Android/computador; no iPhone mostra o passo a passo
export default function BotaoInstalar() {
  const [evento, setEvento] = useState(null);
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);
  const [dica, setDica] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) setInstalado(true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const aoInstalar = (e) => { e.preventDefault(); setEvento(e); };
    const feito = () => setInstalado(true);
    window.addEventListener('beforeinstallprompt', aoInstalar);
    window.addEventListener('appinstalled', feito);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoInstalar);
      window.removeEventListener('appinstalled', feito);
    };
  }, []);

  if (instalado || (!evento && !ios)) return null;

  const clicar = async () => {
    if (evento) {
      evento.prompt();
      const escolha = await evento.userChoice;
      if (escolha.outcome === 'accepted') setInstalado(true);
      setEvento(null);
    } else {
      setDica((v) => !v);
    }
  };

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={clicar}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(11,28,48,.08)' }}>
        <Download size={16} /> Instalar app
      </button>
      {dica && (
        <span role="status" style={{ position: 'absolute', top: 50, right: 0, width: 260, padding: 14, borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -12px rgba(15,23,42,.2)', fontSize: 12, color: '#334155', lineHeight: 1.5, zIndex: 40 }}>
          No iPhone: toque em <strong>Compartilhar</strong> (quadrado com seta) e depois em <strong>Adicionar à Tela de Início</strong>.
        </span>
      )}
    </span>
  );
}
