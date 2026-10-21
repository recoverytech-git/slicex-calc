// Utilitarios para baixar e compartilhar as fotos de um veiculo.

export const slug = (s) =>
  String(s || "veiculo").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Galeria em um unico arquivo HTML (fotos embutidas). Abre em qualquer navegador, sem login. */
export function gerarGaleriaHtml({ titulo, subtitulo, imagens }) {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cards = imagens.map((src, i) => `<img src="${src}" alt="Foto ${i + 1}" loading="lazy">`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title><style>
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f5f7fb;color:#0f172a}
header{background:#0E1A2E;color:#fff;padding:22px 24px}
header h1{margin:0;font-size:20px;font-weight:800}
header p{margin:6px 0 0;color:#94a3b8;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;padding:20px;max-width:1280px;margin:0 auto}
.grid img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;cursor:zoom-in;background:#e2e8f0;box-shadow:0 2px 8px rgba(15,23,42,.08)}
.lb{position:fixed;inset:0;background:rgba(2,6,23,.94);display:none;align-items:center;justify-content:center;padding:16px}
.lb.on{display:flex}
.lb img{max-width:92vw;max-height:86vh;border-radius:12px}
.lb button{position:absolute;width:44px;height:44px;border-radius:12px;border:0;background:#1e2d45;color:#fff;font-size:22px;cursor:pointer}
.ant{left:16px;top:50%}.prox{right:16px;top:50%}.fec{top:16px;right:16px}
.cont{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);color:#cbd5e1;font:600 13px system-ui}
</style></head><body>
<header><h1>${esc(titulo)}</h1><p>${esc(subtitulo)}</p></header>
<div class="grid">${cards}</div>
<div class="lb" id="lb"><button class="fec" id="fec" aria-label="Fechar">×</button><button class="ant" id="ant" aria-label="Anterior">‹</button><img id="lbi" alt=""><button class="prox" id="prox" aria-label="Próxima">›</button><div class="cont" id="cont"></div></div>
<script>
(function(){var imgs=Array.prototype.slice.call(document.querySelectorAll('.grid img')),lb=document.getElementById('lb'),li=document.getElementById('lbi'),ct=document.getElementById('cont'),i=0;
function mostrar(){i=(i+imgs.length)%imgs.length;li.src=imgs[i].src;ct.textContent=(i+1)+' de '+imgs.length;}
function abrir(n){i=n;lb.classList.add('on');mostrar();}
function fechar(){lb.classList.remove('on');}
imgs.forEach(function(im,n){im.addEventListener('click',function(){abrir(n);});});
document.getElementById('fec').onclick=fechar;
document.getElementById('ant').onclick=function(){i--;mostrar();};
document.getElementById('prox').onclick=function(){i++;mostrar();};
lb.addEventListener('click',function(e){if(e.target===lb)fechar();});
document.addEventListener('keydown',function(e){if(!lb.classList.contains('on'))return;if(e.key==='Escape')fechar();if(e.key==='ArrowLeft'){i--;mostrar();}if(e.key==='ArrowRight'){i++;mostrar();}});
})();
</script></body></html>`;
}
