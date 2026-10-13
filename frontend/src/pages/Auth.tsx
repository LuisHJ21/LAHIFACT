import { useState, type FormEvent } from "react";
import { ArrowRight, ShieldCheck, FileCheck2, Layers3 } from "lucide-react";
import { useApp } from "../context";
import { api, errorMessage } from "../api";
import { ErrorBox } from "../components/ui";
export function Auth() {
  const { login } = useApp();
  const reset = location.pathname === "/reset-password";
  const [mode, setMode] = useState(reset ? "reset" : "login");
  const [email, setEmail] = useState(
    new URLSearchParams(location.search).get("email") || "",
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "login") await login(email, password);
      else if (mode === "forgot") {
        const { data } = await api.post("/auth/forgot-password", { email });
        setMessage(data.message);
      } else {
        await api.post("/auth/reset-password", {
          email,
          token: new URLSearchParams(location.search).get("token"),
          password,
          password_confirmation: confirmation,
        });
        setMode("login");
        setMessage("Contraseña actualizada. Inicia sesión.");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-icon">
            <Layers3 />
          </span>
          LAHI<span>FACT</span>
        </div>
        <div>
          <span className="auth-tag">
            <ShieldCheck size={16} /> Facturación electrónica para Perú
          </span>
          <h1>
            Tu negocio crece.
            <br />
            Tu facturación
            <br />
            <em>también.</em>
          </h1>
          <p>
            Emite, organiza y sigue tus comprobantes en un solo lugar. Más
            claridad para ti, más tiempo para tu negocio.
          </p>
          <div className="auth-feature">
            <FileCheck2 />
            <span>
              Facturas, boletas y notas electrónicas
              <br />
              <small>Con seguimiento de aceptación SUNAT</small>
            </span>
          </div>
        </div>
        <small>LAHIFACT · Una forma más simple de facturar.</small>
      </section>
      <section className="auth-form">
        <form onSubmit={submit}>
          <span className="eyebrow">BIENVENIDO A LAHIFACT</span>
          <h2>
            {mode === "login"
              ? "Ingresa a tu cuenta"
              : mode === "forgot"
                ? "Recupera tu acceso"
                : "Nueva contraseña"}
          </h2>
          <p>Gestiona tu empresa desde cualquier dispositivo.</p>
          <ErrorBox message={error} />
          {message && <div className="notice">{message}</div>}
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
            />
          </label>
          {mode !== "forgot" && (
            <label>
              Contraseña
              <input
                type="password"
                required
                minLength={mode === "reset" ? 12 : undefined}
                autoComplete={
                  mode === "reset" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {mode === "reset" && (
            <label>
              Confirmar contraseña
              <input
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
          )}
          <button className="button primary w-full" disabled={busy}>
            {busy
              ? "Procesando…"
              : mode === "login"
                ? "Ingresar"
                : mode === "forgot"
                  ? "Enviar enlace"
                  : "Actualizar contraseña"}
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode(mode === "login" ? "forgot" : "login");
              setError("");
              setMessage("");
            }}
          >
            {mode === "login"
              ? "¿Olvidaste tu contraseña?"
              : "Volver al inicio de sesión"}
          </button>
          <div className="auth-foot">
            <ShieldCheck size={16} /> Tus datos y credenciales se mantienen
            privados.
          </div>
        </form>
      </section>
    </main>
  );
}
