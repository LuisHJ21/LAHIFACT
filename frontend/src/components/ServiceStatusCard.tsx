import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useData, Loading, ErrorBox } from "./ui";
import { date, money, type Account, type Company } from "../types";

export function ServiceStatusCard({ company, version, onPayments }: { company: Company; version: number; onPayments: () => void }) {
  const [retry, setRetry] = useState(0);
  const { data, loading, error } = useData<Account>("/account", version + retry);
  const paid = data?.payments.filter((payment) => payment.billing_period_id === data.period.id).reduce((total, payment) => total + Number(payment.amount), 0) || 0;
  const pending = data ? Math.max(0, Number(data.period.price) - paid) : 0;
  return <section className="panel service-card" aria-label={`Servicio de ${company.name}`}>
    <div className="panel-heading"><div><h2><ShieldCheck size={20} />Estado del servicio</h2><p>{company.name}</p><small>RUC {company.ruc}</small></div></div>
    <div className="service-body">
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={() => setRetry((value) => value + 1)} /> : data && <>
        <span className={`status status-${data.status}`}>{data.status === "active" ? "Activo" : data.status === "suspended" ? "Suspendido" : data.status}</span>
        <dl><div><dt>Plan vigente</dt><dd>{data.subscription.plan.name}</dd></div>
          <div><dt>Periodo contratado</dt><dd>{date(data.period.starts_at)} — {date(data.period.ends_at)} (fin exclusivo)</dd></div>
          <div><dt>Vencimiento del periodo</dt><dd>{date(data.period.due_at)}</dd></div>
          <div><dt>Importe del periodo</dt><dd>{money(data.period.price)}</dd></div>
          <div><dt>Saldo pendiente del periodo</dt><dd>{money(pending)}</dd></div>
          <div><dt>Pago del periodo</dt><dd>{pending > 0 ? "Pendiente" : "Cubierto"}</dd></div>
          <div><dt>Comprobantes disponibles</dt><dd>{data.available}</dd></div>
          <div><dt>Consumidos / reservados</dt><dd>{data.consumed} / {data.reserved}</dd></div>
        </dl>
        <p className="muted">El estado del servicio procede del sistema; el saldo corresponde al periodo mostrado.</p>
      </>}
      <button className="button secondary" onClick={onPayments}>Ver pagos y vencimientos</button>
    </div>
  </section>;
}
