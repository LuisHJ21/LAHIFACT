import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LoaderCircle,
  X,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, errorMessage } from "../api";
import { statusNames } from "../types";

export function useData<T>(path: string, version = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api
      .get<T>(path, { signal: controller.signal })
      .then((r) => setData(r.data))
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, version]);
  return { data, loading, error };
}
export function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value}`}>
      <i />
      {statusNames[value] || value}
    </span>
  );
}
export function Loading() {
  return (
    <div className="empty" role="status" aria-live="polite">
      <LoaderCircle className="animate-spin" size={26} />
      <span>Cargando información…</span>
    </div>
  );
}
export function Empty({
  title = "Aún no hay registros",
  text = "Los nuevos registros aparecerán aquí.",
  icon = <Inbox size={36} />,
  action,
}: {
  title?: string;
  text?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <strong>{title}</strong>
      <span>{text}</span>
      {action}
    </div>
  );
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return message ? (
    <div role="alert" className="error-box">
      {message}
      {onRetry && <button type="button" className="button secondary" onClick={onRetry}>Reintentar</button>}
    </div>
  ) : null;
}
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">TU NEGOCIO, EN ORDEN</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = () =>
      dialog?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
      );
    focusable()?.[0]?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const nodes = focusable();
        if (!nodes?.length) return;
        if (event.shiftKey && document.activeElement === nodes[0]) {
          event.preventDefault();
          nodes[nodes.length - 1].focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === nodes[nodes.length - 1]
        ) {
          event.preventDefault();
          nodes[0].focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeRef.current();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "modal-wide" : ""}`}
      >
        <header>
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Pager({
  current,
  last,
  total,
  from,
  to,
  onChange,
}: {
  current: number;
  last: number;
  total: number;
  from?: number | null;
  to?: number | null;
  onChange: (n: number) => void;
}) {
  if (total === 0) return null;
  return (
    <footer className="pager">
      <span>
        {from != null && to != null ? `Mostrando ${from}–${to} de ${total} registros` : `${total} registros`}
        {last > 1 && ` · página ${current} de ${last}`}
      </span>
      {last > 1 && <div>
        <button
          aria-label="Página anterior"
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          aria-label="Página siguiente"
          disabled={current >= last}
          onClick={() => onChange(current + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>}
    </footer>
  );
}
