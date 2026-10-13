import { useState } from "react";
import {
  LayoutDashboard,
  ReceiptText,
  FileMinus2,
  CalendarDays,
  Package,
  Users,
  BarChart3,
  Settings2,
  Warehouse,
  CircleUserRound,
  Layers3,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useApp } from "./context";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Directory } from "./pages/Directory";
import { Invoices } from "./pages/Invoices";
import { Summaries } from "./pages/Summaries";
import { Settings } from "./pages/Settings";
import { Account, Reports } from "./pages/Account";
import { Admin } from "./pages/Admin";
import { Loading } from "./components/ui";
import { errorMessage } from "./api";
const navigation = [
  { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
  { id: "sales", label: "Facturas y boletas", icon: ReceiptText },
  { id: "notes", label: "Notas de crédito / débito", icon: FileMinus2 },
  { id: "summaries", label: "Resumen diario", icon: CalendarDays },
  { id: "products", label: "Productos y servicios", icon: Package },
  { id: "customers", label: "Clientes", icon: Users },
  { id: "reports", label: "Reportes", icon: BarChart3 },
  { id: "settings", label: "Configuración SUNAT", icon: Settings2 },
  { id: "warehouses", label: "Almacenes", icon: Warehouse },
  { id: "account", label: "Datos de cuenta", icon: CircleUserRound },
];
export default function App() {
  const { user, loading, companyId, companies, selectCompany, logout, notify } =
    useApp();
  const [page, setPage] = useState("dashboard");
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      notify(errorMessage(error), true);
    } finally {
      setPage("dashboard");
      setOpen(false);
      setLoggingOut(false);
    }
  };
  if (loading) return <Loading />;
  if (!user) return <Auth />;
  const navigate = (id: string) => {
    setPage(id);
    setOpen(false);
    window.scrollTo({ top: 0 });
  };
  const items = navigation.filter(
    (n) =>
      user.role !== "operator" ||
      !["settings", "warehouses", "reports", "account"].includes(n.id),
  );
  function content() {
    if (page === "admin" && user?.role === "admin")
      return <Admin navigate={navigate} />;
    if (!companyId) return <Admin navigate={navigate} />;
    switch (page) {
      case "dashboard":
        return <Dashboard navigate={navigate} />;
      case "sales":
        return <Invoices />;
      case "notes":
        return <Invoices notes />;
      case "summaries":
        return <Summaries />;
      case "customers":
        return <Directory resource="customers" />;
      case "products":
        return <Directory resource="products" />;
      case "warehouses":
        return <Directory resource="warehouses" />;
      case "settings":
        return <Settings />;
      case "account":
        return <Account />;
      case "reports":
        return <Reports />;
      default:
        return <Dashboard navigate={navigate} />;
    }
  }
  return (
    <div className="app-shell">
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-icon">
            <Layers3 size={23} />
          </span>
          LAHI<span>FACT</span>
          <button
            className="mobile-close icon-button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="sidebar-label">ESPACIO DE TRABAJO</p>
        <nav aria-label="Menú principal">
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
          {user.role === "admin" && (
            <>
              <p className="sidebar-label mt-6">ADMINISTRACIÓN</p>
              <button
                className={page === "admin" ? "active" : ""}
                onClick={() => navigate("admin")}
              >
                <ShieldCheck size={19} />
                <span>Panel administrador</span>
              </button>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <ShieldCheck size={21} />
            <div>
              <strong>Conectado a tu negocio</strong>
              <small>Facturación clara y organizada</small>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={18} />
            {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-company">
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir menú"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="company-avatar">
              {companies.find((c) => c.id === companyId)?.name.slice(0, 1) ||
                "L"}
            </span>
            <div>
              {user.role === "admin" ? (
                <select
                  aria-label="Empresa seleccionada"
                  value={companyId || ""}
                  onChange={(e) => selectCompany(Number(e.target.value))}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <strong>{user.company?.name}</strong>
              )}
              <small>
                RUC {companies.find((c) => c.id === companyId)?.ruc || "—"}
              </small>
            </div>
            <ChevronDown size={14} className="muted" />
          </div>
          <div className="user-menu">
            <span className="online-indicator">Sesión activa</span>
            <span className="user-avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.role === "admin"
                  ? "Administrador"
                  : user.role === "owner"
                    ? "Responsable"
                    : "Operador"}
              </small>
            </div>
            <button
              type="button"
              className="button secondary logout-action"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              disabled={loggingOut}
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>{loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}</span>
            </button>
          </div>
        </header>
        <main className="main-content" key={`${companyId}-${page}`}>
          {content()}
          <footer className="page-footer">
            LAHIFACT · Facturación electrónica
            <span>Hecho para tu negocio en Perú</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
