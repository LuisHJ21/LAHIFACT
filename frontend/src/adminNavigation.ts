import { Building2, CreditCard, Layers3, Users } from "lucide-react";

export type AdminTab = "companies" | "plans" | "payments" | "users";

export const adminNavigation: { id: AdminTab; label: string; icon: typeof Building2 }[] = [
  { id: "companies", label: "Empresas", icon: Building2 },
  { id: "plans", label: "Planes", icon: Layers3 },
  { id: "payments", label: "Pagos y vencimientos", icon: CreditCard },
  { id: "users", label: "Usuarios", icon: Users },
];
