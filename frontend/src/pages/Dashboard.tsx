import {
  ArrowUpRight,
  FilePlus2,
  Users,
  ReceiptText,
  Wallet,
  Calculator,
  ArrowRight,
} from "lucide-react";
import {
  useData,
  Loading,
  ErrorBox,
  PageHeader,
  Status,
  Empty,
} from "../components/ui";
import {
  money,
  date,
  documentNames,
  type Account,
  type Invoice,
} from "../types";
type DashboardData = {
  sales: string;
  tax: string;
  invoice_count: number;
  customer_count: number;
  days: { date: string; total: string }[];
  recent: Invoice[];
  account: Account;
};
export function Dashboard({ navigate }: { navigate: (page: string) => void }) {
  const { data, loading, error } = useData<DashboardData>("/dashboard");
  if (loading) return <Loading />;
  if (!data) return <ErrorBox message={error} />;
  const maximum = Math.max(1, ...data.days.map((d) => Number(d.total)));
  const account = data.account;
  return (
    <>
      <PageHeader
        title="Resumen de tu negocio"
        subtitle="Una vista clara de tus ventas y comprobantes."
        action={
          <button className="button primary" onClick={() => navigate("sales")}>
            <FilePlus2 size={18} />
            Emitir comprobante
          </button>
        }
      />
      {account.status === "suspended" && (
        <ErrorBox message="Tu servicio está suspendido. Puedes consultar y descargar el historial. Revisa tus pagos en Datos de cuenta." />
      )}
      <div className="stats-grid">
        {[
          { label: "Ventas aceptadas", value: money(data.sales), icon: Wallet },
          {
            label: "Comprobantes aceptados",
            value: data.invoice_count,
            icon: ReceiptText,
          },
          {
            label: "IGV de ventas aceptadas",
            value: money(data.tax),
            icon: Calculator,
          },
          {
            label: "Clientes registrados",
            value: data.customer_count,
            icon: Users,
          },
        ].map(({ label, value, icon: Icon }) => (
          <article className="stat-card" key={label}>
            <div>
              <span className="stat-icon">
                <Icon size={21} />
              </span>
              <ArrowUpRight size={18} className="muted" />
            </div>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>Información de tu empresa</small>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Ventas de los últimos 7 días</h2>
              <p>Comprobantes aceptados · soles</p>
            </div>
            <span className="pill">Esta semana</span>
          </div>
          <div
            className="chart"
            role="img"
            aria-label="Gráfico de ventas de los últimos siete días"
          >
            {data.days.map((d) => (
              <div key={d.date} className="chart-column">
                <span>{money(d.total)}</span>
                <div
                  style={{
                    height: `${Math.max(2, (Number(d.total) / maximum) * 170)}px`,
                  }}
                  title={`${date(d.date)}: ${money(d.total)}`}
                />
                <small>
                  {new Date(d.date + "T12:00:00").toLocaleDateString("es-PE", {
                    weekday: "short",
                  })}
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="quota-card">
          <div className="quota-top">
            <ReceiptText />
            <span>Tu plan {account.subscription.plan.name}</span>
          </div>
          <strong>{account.available}</strong>
          <h2>comprobantes disponibles</h2>
          <p>
            {account.consumed} aceptados · {account.reserved} en procesamiento
          </p>
          <div className="progress">
            <div
              style={{
                width: `${Math.min(100, ((account.consumed + account.reserved) / account.period.quota) * 100)}%`,
              }}
            />
          </div>
          <small>
            Bolsa de {account.period.quota} · hasta{" "}
            {date(account.period.ends_at)}
          </small>
          <button onClick={() => navigate("account")}>
            Ver mi plan <ArrowRight size={18} />
          </button>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Últimos comprobantes</h2>
            <p>Consulta el estado de tus emisiones recientes.</p>
          </div>
          <button className="text-button" onClick={() => navigate("sales")}>
            Ver historial <ArrowRight size={16} />
          </button>
        </div>
        {!data.recent.length ? (
          <Empty
            title="Tu primera venta empieza aquí"
            text="Registra clientes y productos y emite tu primer comprobante."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Comprobante</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <strong>
                        {i.series}-{String(i.number).padStart(8, "0")}
                      </strong>
                      <small>{documentNames[i.document_type]}</small>
                    </td>
                    <td>{i.customer_snapshot.name}</td>
                    <td>{date(i.issued_at)}</td>
                    <td>
                      <Status value={i.status} />
                    </td>
                    <td className="text-right font-semibold">
                      {money(i.totals.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="beta-note">
        <ShieldInfo />
        Ambiente de pruebas SUNAT beta por defecto. Los comprobantes beta no
        tienen validez tributaria.
      </div>
    </>
  );
}
function ShieldInfo() {
  return <ReceiptText size={16} />;
}
