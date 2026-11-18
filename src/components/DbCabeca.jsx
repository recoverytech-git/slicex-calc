// Cabecalho padrao dos cartoes da Dashboard (mesmo visual da Estoque)
export default function DbCabeca({ Icone, titulo, sub, acao }) {
  return (
    <div className="db-head2">
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {Icone && <span className="db-sec-ic"><Icone size={18} /></span>}
        <div style={{ minWidth: 0 }}>
          <h3 className="db-h3">{titulo}</h3>
          {sub && <p className="db-sub2">{sub}</p>}
        </div>
      </div>
      {acao}
    </div>
  );
}
