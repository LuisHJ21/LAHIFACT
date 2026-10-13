import { useState } from "react";
import { Download, CalendarDays, CreditCard } from "lucide-react";
import {
  useData,
  Loading,
  ErrorBox,
  PageHeader,
  Empty,
} from "../components/ui";
import { money, date, today, type Account as AccountData } from "../types";
import { download, errorMessage } from "../api";
import { useApp } from "../context";
export function Account({ administrative = false }: { administrative?: boolean }) {
  const [version, setVersion] = useState(0);
  const { data, loading, error } = useData<AccountData>("/account", version);
  if (loading) return <Loading />;
  if (!data || error) return <ErrorBox message={error || "No se pudo cargar la cuenta."} onRetry={() => setVersion((value) => value + 1)} />;
  return (
    <>
      <PageHeader
        title={administrative ? "Pagos y periodos de la empresa" : "Datos de cuenta"}
        subtitle={administrative ? "Consulta del plan, disponibilidad y pagos del servicio contratado." : "Tu plan, disponibilidad y pagos en un solo lugar."}
      />
      <div className="stats-grid">
        <article className="stat-card">
          <p>Plan contratado</p>
          <strong>{data.subscription.plan.name}</strong>
          <small>
            {data.subscription.frequency === "annual"
              ? "Anual · bolsa única"
              : "Mensual · bolsa por periodo"}
          </small>
        </article>
        <article className="stat-card">
          <p>Cupos disponibles</p>
          <strong>{data.available}</strong>
          <small>
            {data.consumed} consumidos · {data.reserved} reservados
          </small>
        </article>
        <article className="stat-card">
          <p>Estado del servicio</p>
          <strong
            className={
              data.status === "active" ? "text-emerald-600" : "text-red-600"
            }
          >
            {data.status === "active" ? "Activo" : "Suspendido"}
          </strong>
          <small>{data.period.user_limit} usuarios permitidos</small>
        </article>
        <article className="stat-card">
          <p>Periodo contratado</p>
          <strong className="!text-xl">{date(data.period.starts_at)}</strong>
          <small>Hasta {date(data.period.ends_at)} (exclusivo)</small>
        </article>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              <CalendarDays size={18} />
              Programación de pagos
            </h2>
            <p>Los vencimientos siguen tu fecha de contratación.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Vencimiento</th>
                <th>Importe</th>
                <th>Pagado</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.periods.map((p) => {
                const paid = data.payments
                  .filter((payment) => payment.billing_period_id === p.id)
                  .reduce((sum, payment) => sum + Number(payment.amount), 0);
                return (
                  <tr key={p.id}>
                    <td>
                      {date(p.starts_at)} — {date(p.ends_at)}
                    </td>
                    <td>{date(p.due_at)}</td>
                    <td>{money(p.price)}</td>
                    <td>{money(paid)}</td>
                    <td>{money(Math.max(0, Number(p.price) - paid))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              <CreditCard size={18} />
              Historial de pagos
            </h2>
            <p>Pagos registrados por la administración.</p>
          </div>
        </div>
        {data.payments.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Referencia</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{date(p.paid_at)}</td>
                    <td>{p.reference}</td>
                    <td>{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
export function Reports() {
  const { notify } = useApp();
  const [from, setFrom] = useState(today().slice(0, 7) + "-01");
  const [to, setTo] = useState(today());
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle="Exporta tus comprobantes y analiza las ventas de tu empresa."
      />
      <section className="panel settings-panel">
        <h2>Reporte de comprobantes</h2>
        <p className="muted">
          Incluye facturas, boletas y notas con sus estados, bases e impuestos.
        </p>
        <div className="form-grid mt-6">
          <label>
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <div className="form-actions">
          <button
            className="button primary"
            disabled={busy || to < from}
            onClick={async () => {
              setBusy(true);
              try {
                await download(
                  `/reports/sales?from=${from}&to=${to}`,
                  "comprobantes.csv",
                );
              } catch (e) {
                notify(errorMessage(e), true);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Download size={17} />
            {busy ? "Generando…" : "Descargar CSV"}
          </button>
        </div>
      </section>
    </>
  );
}
