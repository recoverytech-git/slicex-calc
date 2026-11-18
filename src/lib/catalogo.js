// Filtros do catalogo publico (aplicados no navegador sobre a lista ja liberada pela loja)
export function filtrarCatalogo(lista, f = {}) {
  const t = String(f.busca || '').trim().toLowerCase();
  return lista.filter((v) =>
    (!t || `${v.marca || ''} ${v.modelo || ''} ${v.cor || ''} ${v.cidade || ''} ${v.categoria || ''} ${v.loja_nome || ''}`.toLowerCase().includes(t)) &&
    (!f.precoMax || Number(v.preco_venda_pretendido) <= Number(f.precoMax)) &&
    (!f.anoMin || Number(v.ano_modelo) >= Number(f.anoMin)) &&
    (!f.combustivel || v.combustivel === f.combustivel) &&
    (!f.cambio || v.cambio === f.cambio)
  );
}

export function opcoesFiltro(lista) {
  const unicos = (k) => [...new Set(lista.map((v) => v[k]).filter(Boolean))].sort();
  return { combustiveis: unicos('combustivel'), cambios: unicos('cambio'), anos: unicos('ano_modelo').sort((a, b) => b - a) };
}
