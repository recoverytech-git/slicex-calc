import { House, Landmark, Percent, Scissors, Car, Warehouse, BadgeDollarSign, LayoutDashboard, Users } from "lucide-react";

export const NAV_PRINCIPAL = [
  { to: "/app", label: "Início", curto: "Início", icon: House },
  { to: "/financiamento", label: "Financiamento", curto: "Financ.", icon: Landmark },
  { to: "/percentual", label: "Diferença %", curto: "Dif. %", icon: Percent },
  { to: "/amortizacao", label: "Amortização", curto: "Amortiz.", icon: Scissors },
  { to: "/calcula-car", label: "Calcula-Car", curto: "Carro", icon: Car },
  { to: "/estoque", label: "Estoque", curto: "Estoque", icon: Warehouse },
];

/** Itens visíveis para cada papel (a regra de verdade está no banco; isto só organiza a navegação). */
export function itensNav(papel) {
  const extra = [];
  if (["admin_master", "proprietario", "gerente"].includes(papel))
    extra.push({ to: "/vendas", label: "Vendidos", curto: "Vendidos", icon: BadgeDollarSign });
  if (["admin_master", "proprietario"].includes(papel))
    extra.push(
      { to: "/painel", label: "Painel", curto: "Painel", icon: LayoutDashboard },
      { to: "/admin/usuarios", label: "Usuários", curto: "Usuários", icon: Users },
    );
  return [...NAV_PRINCIPAL, ...extra];
}
