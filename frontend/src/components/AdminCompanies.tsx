import { useState } from "react";
import { ArrowRight, Ban, CheckCircle2, Pencil, Search } from "lucide-react";
import { Empty, Pager } from "./ui";
import { date, type Company, type Plan, type Period } from "../types";

export type AdminSubscription = { company_id: number; plan_id: number; frequency: string };

export function AdminCompanies({ companies, plans, subscriptions, periods, busyId, onOpen, onPlan, onStatus, onCreate }: {
  companies: Company[]; plans: Plan[]; subscriptions: AdminSubscription[]; periods: Period[];
  busyId: number | null;
  onOpen: (company: Company) => void;
  onPlan: (company: Company, subscription?: AdminSubscription) => void;
  onStatus: (company: Company) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = search.trim().toLocaleLowerCase("es-PE");
  const results = companies.filter((company) => company.name.toLocaleLowerCase("es-PE").includes(query) || company.ruc.includes(query));
  const last = Math.max(1, Math.ceil(results.length / 10));
  const current = Math.min(page, last);
  const from = (current - 1) * 10;
  return <>
    <div className="panel-heading admin-company-heading">
      <div><h2>Empresas registradas</h2><p>Administra las empresas del sistema.</p></div>
      <label className="search admin-search"><Search size={18} aria-hidden="true" />
        <input aria-label="Buscar empresas por nombre o RUC" placeholder="Buscar nombre o RUC…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      </label>
    </div>
    {!results.length ? <Empty title={companies.length ? "No encontramos empresas" : "Aún no hay empresas registradas"}
      text={companies.length ? "Prueba con otro nombre o RUC." : "Registra una empresa para comenzar a administrar sus planes y usuarios."}
      action={companies.length ? <button className="button secondary" onClick={() => { setSearch(""); setPage(1); }}>Limpiar búsqueda</button> : <button className="button primary" onClick={onCreate}>Registrar empresa</button>} /> : <>
      <div className="table-wrap admin-company-table"><table>
        <thead><tr><th>Empresa</th><th>RUC</th><th>Plan</th><th>Estado manual</th><th>Vencimiento del periodo</th><th>Acciones</th></tr></thead>
        <tbody>{results.slice(from, from + 10).map((company) => {
          const subscription = subscriptions.find((item) => item.company_id === company.id);
          const period = periods.find((item) => item.company_id === company.id);
          return <tr key={company.id}>
            <td><strong>{company.name}</strong></td><td>{company.ruc}</td>
            <td>{plans.find((plan) => plan.id === subscription?.plan_id)?.name || "Sin plan"}
              {subscription && <small>{subscription.frequency === "annual" ? "Anual" : "Mensual"}</small>}</td>
            <td><span className={`status status-${company.status}`}>{company.status === "active" ? "Activo" : company.status === "suspended" ? "Suspendido" : company.status}</span></td>
            <td>{period ? date(period.due_at) : "No disponible"}</td>
            <td><div className="admin-row-actions">
              <button className="button primary small" onClick={() => onOpen(company)}>Ver detalle de empresa<ArrowRight size={14} /></button>
              <button className="button secondary small" aria-label={`Gestionar plan de ${company.name}`} onClick={() => onPlan(company, subscription)}><Pencil size={14} />Plan</button>
              <button className="icon-button" disabled={busyId !== null} aria-label={`${company.status === "active" ? "Suspender" : "Activar"} empresa ${company.name}`} title={company.status === "active" ? "Suspender empresa" : "Activar empresa"} onClick={() => onStatus(company)}>
                {company.status === "active" ? <Ban size={18} /> : <CheckCircle2 size={18} />}
              </button>
            </div></td>
          </tr>;
        })}</tbody>
      </table></div>
      <Pager current={current} last={last} total={results.length} from={from + 1} to={Math.min(from + 10, results.length)} onChange={setPage} />
      <p className="admin-table-note">El estado manual no representa el estado financiero. Los impagos también pueden suspender el servicio. Se muestra el vencimiento del último periodo registrado.</p>
    </>}
  </>;
}
