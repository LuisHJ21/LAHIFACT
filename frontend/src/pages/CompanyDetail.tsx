import { useState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import { PageHeader } from "../components/ui";
import { ServiceStatusCard } from "../components/ServiceStatusCard";
import type { Company } from "../types";
import { Invoices } from "./Invoices";
import { Account } from "./Account";
import { SubmissionHistory } from "../components/SubmissionHistory";

type DetailSection = "overview" | "sales" | "notes" | "submissions" | "payments";
const sections: { id: DetailSection; label: string }[] = [
  { id: "overview", label: "Información y servicio" },
  { id: "sales", label: "Historial de comprobantes" },
  { id: "notes", label: "Notas de crédito y débito" },
  { id: "submissions", label: "Resúmenes y envíos SUNAT" },
  { id: "payments", label: "Pagos y periodos" },
];

export function CompanyDetail({ company, onBack }: { company: Company; onBack: () => void }) {
  const [section, setSection] = useState<DetailSection>("overview");
  return <div className="company-detail">
    <button className="button secondary company-detail-back" onClick={onBack}><ArrowLeft size={18} />Volver a empresas</button>
    <PageHeader title="Detalle de empresa" subtitle={`${company.name} · RUC ${company.ruc}`} />
    <p className="notice company-readonly">Consulta administrativa de solo lectura. La emisión y gestión de registros operativos corresponde a los usuarios de la empresa.</p>
    <nav className="tabs" aria-label="Secciones del detalle de empresa">
      {sections.map(({ id, label }) => <button key={id} className={section === id ? "active" : ""} aria-current={section === id ? "page" : undefined} onClick={() => setSection(id)}>{label}</button>)}
    </nav>
    {section === "overview" && <div className="company-overview">
      <section className="panel"><div className="panel-heading"><h2><Building2 size={20} />Información de la empresa</h2></div>
        <dl className="company-info"><div><dt>Razón social</dt><dd>{company.name}</dd></div><div><dt>RUC</dt><dd>{company.ruc}</dd></div>
          <div><dt>Domicilio fiscal</dt><dd>{company.address || "No registrado"}</dd></div>
          <div><dt>Ubicación</dt><dd>{[company.department, company.province, company.district].filter(Boolean).join(" / ") || "No registrada"}</dd></div>
          <div><dt>Estado manual</dt><dd>{company.status === "active" ? "Activo" : company.status === "suspended" ? "Suspendido" : company.status}</dd></div>
          <div><dt>Entorno SUNAT</dt><dd>{company.environment === "beta" ? "Beta" : company.environment === "production" ? "Producción" : "No disponible"}</dd></div>
        </dl>
      </section>
      <ServiceStatusCard company={company} version={0} onPayments={() => setSection("payments")} />
    </div>}
    {section === "sales" && <Invoices readOnly />}
    {section === "notes" && <Invoices notes readOnly />}
    {section === "submissions" && <SubmissionHistory />}
    {section === "payments" && <Account administrative />}
  </div>;
}
