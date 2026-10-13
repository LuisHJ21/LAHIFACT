import { useState, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Users,
  Building2,
  Layers3,
  CreditCard,
} from "lucide-react";
import { useApp } from "../context";
import {
  useData,
  PageHeader,
  Modal,
  Loading,
  ErrorBox,
  Empty,
} from "../components/ui";
import { api, errorMessage } from "../api";
import {
  money,
  date,
  today,
  type Company,
  type Plan,
  type User,
  type Period,
  type Payment,
} from "../types";
import { AdminCompanies } from "../components/AdminCompanies";
import { ServiceStatusCard } from "../components/ServiceStatusCard";
import { adminNavigation, type AdminTab } from "../adminNavigation";
type AdminData = {
  companies: Company[];
  plans: Plan[];
  users: User[];
  periods: Period[];
  payments: Payment[];
  subscriptions: { company_id: number; plan_id: number; frequency: string }[];
};
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: [string, string][];
};
export function Admin({ onCompanyDetail, tab, onTabChange, paymentCompanyId, onPaymentCompanyChange }: {
  onCompanyDetail: (company: Company) => void;
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  paymentCompanyId: number | null;
  onPaymentCompanyChange: (id: number | null) => void;
}) {
  const { companyId, reloadCompanies, notify } = useApp();
  const [version, setVersion] = useState(0);
  const [modal, setModal] = useState<{
    path: string;
    title: string;
    fields: Field[];
    method?: "put";
    values?: Record<string, unknown>;
  } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusCompany, setStatusCompany] = useState<Company | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);
  const {
    data,
    loading,
    error: loadError,
  } = useData<AdminData>("/admin", version);
  const companyOptions: [string, string][] =
    data?.companies.map((c) => [String(c.id), c.name]) || [];
  const planOptions: [string, string][] =
    data?.plans.map((p) => [String(p.id), p.name]) || [];
  const planFields: Field[] = [
    { key: "name", label: "Nombre" },
    { key: "monthly_quota", label: "Cupo mensual", type: "number" },
    { key: "annual_quota", label: "Bolsa anual única", type: "number" },
    { key: "user_limit", label: "Usuarios permitidos", type: "number" },
    { key: "monthly_price", label: "Precio mensual (S/)", type: "number" },
    { key: "annual_price", label: "Precio anual (S/)", type: "number" },
  ];
  function open(config: NonNullable<typeof modal>) {
    setModal(config);
    setForm(
      Object.fromEntries(
        Object.entries({
          starts_at: today(),
          paid_at: today(),
          frequency: "monthly",
          role: "operator",
          ...config.values,
        }).map(([k, v]) => [k, String(v)]),
      ),
    );
    setError("");
  }
  function add() {
    if (tab === "companies")
      open({
        path: "/admin/companies",
        title: "Nueva empresa",
        fields: [
          { key: "ruc", label: "RUC" },
          { key: "name", label: "Razón social" },
          { key: "plan_id", label: "Plan", options: planOptions },
          {
            key: "frequency",
            label: "Periodicidad",
            options: [
              ["monthly", "Mensual"],
              ["annual", "Anual"],
            ],
          },
          { key: "starts_at", label: "Fecha de contratación", type: "date" },
          { key: "owner_name", label: "Nombre del responsable" },
          { key: "email", label: "Correo del responsable", type: "email" },
          {
            key: "password",
            label: "Contraseña inicial (mín. 12 caracteres)",
            type: "password",
          },
        ],
      });
    if (tab === "plans")
      open({ path: "/admin/plans", title: "Nuevo plan", fields: planFields });
    if (tab === "payments")
      open({
        path: "/admin/payments",
        title: "Registrar pago manual",
        fields: [
          {
            key: "billing_period_id",
            label: "Empresa y periodo",
            options: data?.periods.filter((period) => paymentCompanyId === null || period.company_id === paymentCompanyId).map((p) => [
              String(p.id),
              `${data.companies.find((c) => c.id === p.company_id)?.name} · ${date(p.starts_at)} · ${money(p.price)}`,
            ]),
          },
          { key: "amount", label: "Importe (S/)", type: "number" },
          { key: "paid_at", label: "Fecha de pago", type: "date" },
          { key: "reference", label: "Referencia de pago" },
        ],
      });
    if (tab === "users")
      open({
        path: "/admin/users",
        title: "Nuevo usuario",
        fields: [
          { key: "company_id", label: "Empresa", options: companyOptions },
          { key: "name", label: "Nombre" },
          { key: "email", label: "Correo", type: "email" },
          {
            key: "role",
            label: "Permisos",
            options: [
              ["owner", "Responsable"],
              ["operator", "Operador"],
            ],
          },
          {
            key: "password",
            label: "Contraseña (mín. 12 caracteres)",
            type: "password",
          },
        ],
      });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!modal) return;
    setBusy(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        modal.fields.map((f) => [f.key, form[f.key] || ""]),
      );
      await api[modal.method || "post"](modal.path, payload);
      setVersion((v) => v + 1);
      setModal(null);
      notify("Datos guardados correctamente.");
      await reloadCompanies().catch((e) => notify(`Los datos se guardaron, pero no se pudo actualizar la lista de empresas: ${errorMessage(e)}`, true));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus() {
    if (!statusCompany || statusBusyId !== null) return;
    setStatusBusyId(statusCompany.id);
    try {
      await api.patch(`/admin/companies/${statusCompany.id}/status`, {
        status: statusCompany.status === "active" ? "suspended" : "active",
      });
      setVersion((value) => value + 1);
      setStatusCompany(null);
      await reloadCompanies();
      notify("Estado de la empresa actualizado.");
    } catch (e) {
      notify(errorMessage(e), true);
    } finally {
      setStatusBusyId(null);
    }
  }
  if (loading) return <div className="admin-loading" role="status" aria-label="Cargando administración"><div className="stats-grid">{[1, 2, 3, 4].map((key) => <div key={key} className="stat-card skeleton-card" />)}</div><Loading /></div>;
  if (!data || loadError) return <ErrorBox message={loadError || "No se pudo cargar la administración."} onRetry={() => setVersion((value) => value + 1)} />;
  const selectedCompany = data.companies.find((company) => company.id === companyId);
  const month = today().slice(0, 7);
  const monthlyPayments = data.payments.filter((payment) => payment.paid_at.slice(0, 7) === month).reduce((total, payment) => total + Number(payment.amount), 0);
  const filteredPeriods = data.periods.filter((period) => paymentCompanyId === null || period.company_id === paymentCompanyId);
  const filteredPayments = data.payments.filter((payment) => paymentCompanyId === null || payment.company_id === paymentCompanyId);
  const paymentCompany = data.companies.find((company) => company.id === paymentCompanyId);
  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="Gestiona tus empresas, planes y pagos del servicio."
        action={
          <button className="button primary" onClick={add} disabled={tab === "payments" && !filteredPeriods.length} title={tab === "payments" && !filteredPeriods.length ? "No hay periodos disponibles para registrar un pago" : undefined}>
            <Plus size={18} />
            {tab === "payments" ? "Registrar pago" : tab === "companies" ? "Registrar empresa" : tab === "plans" ? "Crear plan" : "Crear usuario"}
          </button>
        }
      />
      <p className="admin-scope">Indicadores globales del servicio · independientes de la empresa seleccionada.</p>
      <div className="stats-grid admin-stats">
        <article className="stat-card">
          <span className="admin-kpi-icon"><Building2 size={20} /></span>
          <p>Empresas</p>
          <strong>{data.companies.length}</strong>
          <small>Total de empresas registradas</small>
        </article>
        <article className="stat-card">
          <span className="admin-kpi-icon"><Users size={20} /></span>
          <p>Usuarios</p>
          <strong>{data.users.length}</strong>
          <small>Usuarios del sistema administrado</small>
        </article>
        <article className="stat-card">
          <span className="admin-kpi-icon"><Layers3 size={20} /></span>
          <p>Suscripciones registradas</p>
          <strong>{data.subscriptions.length}</strong>
          <small>Asignaciones de plan, sin inferir actividad</small>
        </article>
        <article className="stat-card">
          <span className="admin-kpi-icon"><CreditCard size={20} /></span>
          <p>Pagos registrados del mes</p>
          <strong>
            {money(monthlyPayments)}
          </strong>
          <small>Según fecha de pago · {month}</small>
        </article>
      </div>
      <nav className="tabs" aria-label="Módulos administrativos">
        {adminNavigation.map(({ id, label }) => (
          <button
            className={tab === id ? "active" : ""}
            aria-current={tab === id ? "page" : undefined}
            key={id}
            onClick={() => onTabChange(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className={`admin-workspace ${tab === "companies" ? "with-service" : ""}`}>
      <section className="panel admin-panel" aria-label="Contenido administrativo">
        {tab === "companies" && (
          <AdminCompanies companies={data.companies} plans={data.plans} subscriptions={data.subscriptions} periods={data.periods} busyId={statusBusyId}
            onOpen={onCompanyDetail}
            onPlan={(company, subscription) => open({ path: `/admin/companies/${company.id}/plan`, title: "Cambiar plan para futuros periodos", fields: [{ key: "plan_id", label: "Plan", options: planOptions }], values: { plan_id: subscription?.plan_id } })}
            onStatus={setStatusCompany} onCreate={add} />
        )}
        {tab === "plans" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Bolsa mensual / anual</th>
                  <th>Usuarios</th>
                  <th>Precio mensual / anual</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.plans.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>
                      {p.monthly_quota} / {p.annual_quota}
                    </td>
                    <td>{p.user_limit}</td>
                    <td>
                      {money(p.monthly_price)} / {money(p.annual_price)}
                    </td>
                    <td>
                      <button
                        className="button secondary small"
                        onClick={() =>
                          open({
                            path: `/admin/plans/${p.id}`,
                            method: "put",
                            title: "Editar plan",
                            fields: planFields,
                            values: { ...p },
                          })
                        }
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "payments" && (
          <>
            <div className="panel-heading admin-payment-toolbar">
              <div><h2>Pagos y vencimientos</h2><p>{paymentCompanyId === null ? "Todas las empresas administradas." : paymentCompany ? `${paymentCompany.name} · RUC ${paymentCompany.ruc}` : "La empresa filtrada ya no está disponible."}</p></div>
              <label>Filtrar pagos por empresa
                <select value={paymentCompanyId ?? ""} onChange={(event) => onPaymentCompanyChange(event.target.value ? Number(event.target.value) : null)}>
                  <option value="">Todas las empresas</option>
                  {paymentCompanyId !== null && !paymentCompany && <option value={paymentCompanyId}>Empresa no disponible</option>}
                  {data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
              </label>
              {paymentCompanyId !== null && <button className="button secondary small" onClick={() => onPaymentCompanyChange(null)}>Ver todas las empresas</button>}
            </div>
            <div className="panel-heading">
              <div>
                <h2>Programación de pagos</h2>
                <p>Saldo por empresa y periodo contratado.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table aria-label="Periodos y saldos">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Periodo / vencimiento</th>
                    <th>Importe</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeriods.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {
                          data.companies.find((c) => c.id === p.company_id)
                            ?.name
                        }
                      </td>
                      <td>
                        {date(p.starts_at)} — {date(p.ends_at)}
                        <small>Vence: {date(p.due_at)}</small>
                      </td>
                      <td>{money(p.price)}</td>
                      <td>
                        {money(
                          Math.max(
                            0,
                            Number(p.price) -
                              data.payments
                                .filter(
                                  (payment) =>
                                    payment.billing_period_id === p.id,
                                )
                                .reduce(
                                  (s, payment) => s + Number(payment.amount),
                                  0,
                                ),
                          ),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filteredPeriods.length && <Empty title="No hay periodos para esta selección" text="Selecciona otra empresa o registra una empresa con un plan contratado." />}
            <div className="panel-heading">
              <h2>Pagos registrados</h2>
            </div>
            <div className="table-wrap">
              <table aria-label="Pagos registrados">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Fecha</th>
                    <th>Referencia</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {
                          data.companies.find((c) => c.id === p.company_id)
                            ?.name
                        }
                      </td>
                      <td>{date(p.paid_at)}</td>
                      <td>{p.reference}</td>
                      <td>{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filteredPayments.length && <Empty title="No hay pagos para esta selección" text="Los pagos registrados para esta empresa aparecerán aquí." />}
          </>
        )}
        {tab === "users" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Empresa</th>
                  <th>Permisos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <small>{u.email}</small>
                    </td>
                    <td>
                      {data.companies.find((c) => c.id === u.company_id)
                        ?.name || "Administración"}
                    </td>
                    <td>
                      {u.role === "owner"
                        ? "Responsable"
                        : u.role === "operator"
                          ? "Operador"
                          : "Administrador"}
                    </td>
                    <td>
                      {u.role !== "admin" && (
                        <button
                          className="button secondary small"
                          onClick={() =>
                            open({
                              path: `/admin/users/${u.id}`,
                              method: "put",
                              title: "Editar usuario",
                              fields: [
                                { key: "name", label: "Nombre" },
                                {
                                  key: "email",
                                  label: "Correo",
                                  type: "email",
                                },
                                {
                                  key: "role",
                                  label: "Permisos",
                                  options: [
                                    ["owner", "Responsable"],
                                    ["operator", "Operador"],
                                  ],
                                },
                              ],
                              values: { ...u },
                            })
                          }
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "plans" && !data.plans.length && <Empty title="Aún no hay planes" text="Crea un plan para asignarlo a tus empresas." action={<button className="button primary" onClick={add}>Crear plan</button>} />}
        {tab === "users" && !data.users.length && <Empty title="Aún no hay usuarios" text="Registra los usuarios de tus empresas." action={<button className="button primary" onClick={add}>Crear usuario</button>} />}
      </section>
      {tab === "companies" && selectedCompany && <ServiceStatusCard key={selectedCompany.id} company={selectedCompany} version={version} onPayments={() => { onPaymentCompanyChange(selectedCompany.id); onTabChange("payments"); }} />}
      </div>
      {tab === "companies" && <section className="panel" aria-label="Pagos recientes"><div className="panel-heading"><div><h2>Pagos recientes</h2><p>Últimos pagos registrados de todas las empresas, ordenados por fecha de pago.</p></div><button className="button secondary small" onClick={() => { onPaymentCompanyChange(null); onTabChange("payments"); }}>Ver todos</button></div>
        {data.payments.length ? <ul className="admin-payment-list">{[...data.payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at) || b.id - a.id).slice(0, 5).map((payment) => <li key={payment.id}><span className="admin-kpi-icon"><CreditCard size={18} /></span><div><strong>{data.companies.find((company) => company.id === payment.company_id)?.name || "Empresa no disponible"}</strong><small>{payment.reference} · {date(payment.paid_at)}</small></div><strong>{money(payment.amount)}</strong></li>)}</ul> : <Empty title="Aún no hay pagos registrados" text="Los pagos aparecerán aquí después de registrarlos." />}
      </section>}
      {statusCompany && <Modal title={statusCompany.status === "active" ? "Suspender empresa" : "Activar empresa"} onClose={() => { if (statusBusyId === null) setStatusCompany(null); }}>
        <div className="modal-body"><p>¿Confirmas {statusCompany.status === "active" ? "suspender" : "activar"} a <strong>{statusCompany.name}</strong>?</p><p className="admin-table-note">Esta acción cambia el estado manual. Las reglas de pagos y vencimientos siguen aplicándose.</p>
          <div className="form-actions"><button className="button secondary" disabled={statusBusyId !== null} onClick={() => setStatusCompany(null)}>Cancelar</button><button className="button primary" disabled={statusBusyId !== null} onClick={changeStatus}>{statusBusyId !== null ? "Actualizando…" : "Confirmar"}</button></div>
        </div>
      </Modal>}
      {modal && (
        <Modal
          title={modal.title}
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <form onSubmit={submit} className="modal-body">
            <ErrorBox message={error} />
            <div className="form-grid">
              {modal.fields.map((f) => (
                <label key={f.key}>
                  {f.label}
                  {f.options ? (
                    <select
                      required
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, [f.key]: e.target.value }))
                      }
                    >
                      <option value="">Seleccionar…</option>
                      {f.options.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      type={f.type || "text"}
                      min={f.type === "number" ? 0 : undefined}
                      step={f.type === "number" ? ".01" : undefined}
                      minLength={f.type === "password" ? 12 : undefined}
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, [f.key]: e.target.value }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="form-actions">
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
