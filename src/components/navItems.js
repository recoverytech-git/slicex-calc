import { House, Landmark, Percent, Scissors, Car, Warehouse } from "lucide-react";

export const NAV_PRINCIPAL = [
  { to: "/app", label: "Início", curto: "Início", icon: House },
  { to: "/financiamento", label: "Financiamento", curto: "Financ.", icon: Landmark },
  { to: "/percentual", label: "Diferença %", curto: "Dif. %", icon: Percent },
  { to: "/amortizacao", label: "Amortização", curto: "Amortiz.", icon: Scissors },
  { to: "/calcula-car", label: "Calcula-Car", curto: "Carro", icon: Car },
  { to: "/estoque", label: "Estoque", curto: "Estoque", icon: Warehouse },
];
