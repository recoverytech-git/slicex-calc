import { LayoutDashboard, Landmark, Percent, Scissors, Car, Warehouse, BadgeDollarSign, Users, Settings, ScrollText, FileText, ClipboardList, Calculator } from "lucide-react";

export const NAV_PRINCIPAL = [
  { to: "/dashboard", label: "Dashboard", curto: "Dashboard", icon: LayoutDashboard },
  { id: "calculadoras", to: "#calculadoras", label: "Calculadoras", curto: "Calc.", icon: Calculator, tipo: "grupo" },
  { to: "/financiamento", label: "Financiamento", curto: "Financ.", icon: Landmark, grupo: "calculadoras" },
  { to: "/percentual", label: "Diferença %", curto: "Dif. %", icon: Percent, grupo: "calculadoras" },
  { to: "/amortizacao", label: "Amortização", curto: "Amortiz.", icon: Scissors, grupo: "calculadoras" },
  { to: "/calcula-car-novo", label: "Calcula-Car", curto: "Carro", icon: Car },
  { to: "/estoque", label: "Estoque", curto: "Estoque", icon: Warehouse },
  { to: "/ficha", label: "Ficha bancária", curto: "Ficha", icon: FileText },
  { to: "/leads", label: "Leads", curto: "Leads", icon: ClipboardList },
];

/** Itens visíveis por papel. A regra de verdade está no banco; isto só organiza a navegação. */
export function itensNav(papel) {
  const extra = [];
  if (["admin_master", "proprietario", "gerente"].includes(papel))
    extra.push({ to: "/vendas", label: "Vendidos", curto: "Vendidos", icon: BadgeDollarSign });
  if (["admin_master", "proprietario"].includes(papel))
    extra.push({ to: "/admin/usuarios", label: "Usuários", curto: "Usuários", icon: Users });
  if (["admin_master", "proprietario"].includes(papel))
    extra.push({ to: "/configuracoes", label: "Configurações", curto: "Config.", icon: Settings, bloqueado: papel !== "admin_master" });
  if (papel === "admin_master")
    extra.push({ to: "/logs", label: "Logs", curto: "Logs", icon: ScrollText });
  return [...NAV_PRINCIPAL, ...extra];
}
