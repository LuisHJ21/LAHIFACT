import { useEffect, useState, type FormEvent } from "react";
import { Save, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useData, Loading, ErrorBox, PageHeader } from "../components/ui";
import { useApp } from "../context";
import { api, errorMessage } from "../api";
import type { Company } from "../types";
import { Directory } from "./Directory";
export function Settings() {
  const [tab, setTab] = useState("company");
  return (
    <>
      <nav className="tabs" aria-label="Configuración">
        <button
          className={tab === "company" ? "active" : ""}
          onClick={() => setTab("company")}
        >
          Empresa y SUNAT
        </button>
        <button
          className={tab === "establishments" ? "active" : ""}
          onClick={() => setTab("establishments")}
        >
          Establecimientos
        </button>
        <button
          className={tab === "series" ? "active" : ""}
          onClick={() => setTab("series")}
        >
          Series
        </button>
      </nav>
      {tab === "company" ? (
        <CompanyForm />
      ) : (
        <Directory key={tab} resource={tab as "series" | "establishments"} />
      )}
    </>
  );
}
function CompanyForm() {
  const { notify } = useApp();
  const { data, loading, error: loadError } = useData<Company>("/company");
  const [form, setForm] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (data)
      setForm(
        Object.fromEntries(
          [
            "name",
            "address",
            "ubigeo",
            "department",
            "province",
            "district",
            "environment",
          ].map((k) => [k, String(data[k as keyof Company] || "")]),
        ),
      );
  }, [data]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) fd.append(key, value);
      });
      if (file) fd.append("certificate", file);
      await api.post("/company", fd);
      setForm((f) => ({
        ...f,
        sol_user: "",
        sol_password: "",
        certificate_password: "",
      }));
      setFile(null);
      notify("Configuración SUNAT guardada.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (!data) return <ErrorBox message={loadError} />;
  return (
    <>
      <PageHeader
        title="Configuración SUNAT"
        subtitle="Datos fiscales, credenciales y certificado de tu empresa."
      />
      <form onSubmit={submit}>
        <ErrorBox message={error} />
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h2>Datos de la empresa</h2>
              <p>
                RUC vinculado al servicio: <strong>{data.ruc}</strong>
              </p>
            </div>
            <span className="pill">
              <ShieldCheck size={15} />
              Un RUC por servicio
            </span>
          </div>
          <div className="form-grid">
            {[
              ["name", "Razón social"],
              ["address", "Domicilio fiscal"],
              ["ubigeo", "Ubigeo"],
              ["department", "Departamento"],
              ["province", "Provincia"],
              ["district", "Distrito"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  required
                  value={form[key] || ""}
                  maxLength={key === "ubigeo" ? 6 : 255}
                  pattern={key === "ubigeo" ? "[0-9]{6}" : undefined}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        </section>
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h2>Conexión con SUNAT</h2>
              <p>Las contraseñas y el certificado se almacenan cifrados.</p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Ambiente
              <select
                value={form.environment || "beta"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, environment: e.target.value }))
                }
              >
                <option value="beta">Pruebas · SUNAT beta</option>
                <option value="production">Producción</option>
              </select>
            </label>
            <div className="notice">
              {form.environment === "production"
                ? "Los nuevos comprobantes se emitirán en producción."
                : "Los comprobantes beta no tienen validez tributaria."}
            </div>
            {[
              ["sol_user", "Usuario SOL (sin RUC)"],
              ["sol_password", "Clave SOL"],
              ["certificate_password", "Contraseña del certificado"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type={key === "sol_user" ? "text" : "password"}
                  autoComplete="off"
                  value={form[key] || ""}
                  placeholder="Dejar vacío para conservar"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
            <label>
              Certificado digital PFX / P12
              <input
                type="file"
                accept=".pfx,.p12"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <div className="credentials-status">
            <span>
              <CheckCircle2 size={16} />
              {data.has_credentials
                ? "Credenciales registradas"
                : "Credenciales pendientes"}
            </span>
            <span>
              <CheckCircle2 size={16} />
              {data.has_certificate
                ? "Certificado registrado"
                : "Certificado pendiente"}
            </span>
          </div>
        </section>
        <div className="form-actions">
          <button disabled={busy} className="button primary">
            <Save size={17} />
            {busy ? "Guardando…" : "Guardar configuración"}
          </button>
        </div>
      </form>
    </>
  );
}
