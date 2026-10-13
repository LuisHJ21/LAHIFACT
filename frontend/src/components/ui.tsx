import { useEffect, useState, type ReactNode } from "react";
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
    <div className="empty">
      <LoaderCircle className="animate-spin" size={26} />
      <span>Cargando información…</span>
    </div>
  );
}
export function Empty({
  title = "Aún no hay registros",
  text = "Los nuevos registros aparecerán aquí.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <Inbox size={36} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="error-box">
      {message}
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
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector(
      '[role="dialog"]',
    ) as HTMLElement | null;
    const focusable = () =>
      dialog?.querySelectorAll<HTMLElement>(
        'button,input,select,textarea,a[href],[tabindex="0"]',
      );
    focusable()?.[0]?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
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
  onChange,
}: {
  current: number;
  last: number;
  total: number;
  onChange: (n: number) => void;
}) {
  return (
    <footer className="pager">
      <span>
        {total} registros · página {current} de {last}
      </span>
      <div>
        <button
          aria-label="Página anterior"
          disabled={current === 1}
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
      </div>
    </footer>
  );
}
