import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import type { User } from "../types";

export function UserProfile({ user, busy, onLogout }: { user: User; busy: boolean; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const role = user.role === "admin" ? "Administrador" : user.role === "owner" ? "Responsable" : "Operador";
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  useEffect(() => {
    if (!open) return;
    action.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
    };
  }, [open]);
  return (
    <div className="profile-menu" ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <button ref={trigger} type="button" className="profile-trigger" aria-label={`Cuenta de ${user.name}`} aria-expanded={open} aria-controls="profile-options" onClick={() => setOpen((value) => !value)}>
        <span className="user-avatar" aria-hidden="true">{initials}</span>
        <span className="profile-copy"><strong>{user.name}</strong><small>{role}</small></span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && <div id="profile-options" className="profile-dropdown">
        <p><strong>{user.name}</strong><small>{role}</small></p>
        <button ref={action} type="button" disabled={busy} onClick={() => { setOpen(false); onLogout(); }}>
          <LogOut size={18} aria-hidden="true" />{busy ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </div>}
    </div>
  );
}
