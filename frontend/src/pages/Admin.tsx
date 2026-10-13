import { useState, type FormEvent } from "react";
import {
  Plus,
  Building2,
  Pencil,
  ArrowRight,
  Ban,
  CheckCircle2,
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
export function Admin({ navigate }: { navigate: (page: string) => void }) {
  const { selectCompany, reloadCompanies, notify } = useApp();
  const [tab, setTab] = useState("companies");
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
            options: data?.periods.map((p) => [
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
      await reloadCompanies();
      setVersion((v) => v + 1);
      setModal(null);
      notify("Datos guardados correctamente.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox message={loadError} />;
  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="Gestiona tus empresas, planes y pagos del servicio."
        action={
          <button className="button primary" onClick={add}>
            <Plus size={18} />
            {tab === "payments" ? "Registrar pago" : "Nuevo registro"}
          </button>
        }
      />
      <div className="stats-grid">
        <article className="stat-card">
          <p>Empresas</p>
          <strong>{data.companies.length}</strong>
        </article>
        <article className="stat-card">
          <p>Usuarios</p>
          <strong>{data.users.length}</strong>
        </article>
        <article className="stat-card">
          <p>Planes</p>
          <strong>{data.plans.length}</strong>
        </article>
        <article className="stat-card">
          <p>Pagos mostrados</p>
          <strong>
            {money(data.payments.reduce((s, p) => s + Number(p.amount), 0))}
          </strong>
        </article>
      </div>
      <nav className="tabs">
        {[
          ["companies", "Empresas"],
          ["plans", "Planes"],
          ["payments", "Pagos y vencimientos"],
          ["users", "Usuarios"],
        ].map(([v, l]) => (
          <button
            className={tab === v ? "active" : ""}
            key={v}
            onClick={() => setTab(v)}
          >
            {l}
          </button>
        ))}
      </nav>
      <section className="panel">
        {tab === "companies" && (
          <div className="company-grid">
            {data.companies.map((c) => {
              const subscription = data.subscriptions.find(
                (s) => s.company_id === c.id,
              );
              return (
                <article className="company-card" key={c.id}>
                  <span className="directory-icon">
                    <Building2 />
                  </span>
                  <h3>{c.name}</h3>
                  <p>RUC {c.ruc}</p>
                  <span className="pill">
                    {data.plans.find((p) => p.id === subscription?.plan_id)
                      ?.name || "Sin plan"}{" "}
                    ·{" "}
                    {subscription?.frequency === "annual" ? "Anual" : "Mensual"}
                  </span>
                  <div className="detail-actions">
                    <button
                      className="button primary small"
                      onClick={() => {
                        selectCompany(c.id);
                        navigate("dashboard");
                      }}
                    >
                      Abrir empresa
                      <ArrowRight size={14} />
                    </button>
                    <button
                      className="button secondary small"
                      onClick={() =>
                        open({
                          path: `/admin/companies/${c.id}/plan`,
                          title: "Cambiar plan para futuros periodos",
                          fields: [
                            {
                              key: "plan_id",
                              label: "Plan",
                              options: planOptions,
                            },
                          ],
                          values: { plan_id: subscription?.plan_id },
                        })
                      }
                    >
                      <Pencil size={14} />
                      Plan
                    </button>
                    <button
                      className="icon-button"
                      aria-label={
                        c.status === "active"
                          ? "Suspender empresa"
                          : "Activar empresa"
                      }
                      onClick={async () => {
                        try {
                          await api.patch(`/admin/companies/${c.id}/status`, {
                            status:
                              c.status === "active" ? "suspended" : "active",
                          });
                          setVersion((v) => v + 1);
                          await reloadCompanies();
                        } catch (e) {
                          notify(errorMessage(e), true);
                        }
                      }}
                    >
                      {c.status === "active" ? (
                        <Ban size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                    </button>
                  </div>
                  <small>
                    Estado manual:{" "}
                    {c.status === "active" ? "Activo" : "Suspendido"}. Los
                    impagos también suspenden el servicio.
                  </small>
                </article>
              );
            })}
          </div>
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
            <div className="panel-heading">
              <div>
                <h2>Programación de pagos</h2>
                <p>Saldo por empresa y periodo contratado.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Periodo / vencimiento</th>
                    <th>Importe</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map((p) => (
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
            <div className="panel-heading">
              <h2>Pagos registrados</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Fecha</th>
                    <th>Referencia</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
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
        {!data.companies.length && <Empty title="Crea tu primera empresa" />}
      </section>
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
