// sem-rascunho: o formulário e os resultados vivem no documento do design; o cálculo usa calcPrice e calcSAC
import PageTransition from "../components/PageTransition";

export default function Financiamento() {
  return (
    <PageTransition>
      <iframe
        src="/calculadora-financiamento.html"
        title="Simulador Avançado de Financiamento"
        style={{ display: "block", width: "100%", height: "100vh", border: 0 }}
      />
    </PageTransition>
  );
}
