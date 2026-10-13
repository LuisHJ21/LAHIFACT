import { useEffect, useRef, useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
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
import { UserProfile } from "./components/UserProfile";
import { adminNavigation, type AdminTab } from "./adminNavigation";
import { CompanyDetail } from "./pages/CompanyDetail";
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
  const [adminTab, setAdminTab] = useState<AdminTab>("companies");
  const [paymentCompanyId, setPaymentCompanyId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]") || []).filter((node) => node.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const nodes = focusable();
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const onResize = () => { if (window.innerWidth > 900) setOpen(false); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      previous?.focus();
    };
  }, [open]);
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
      setAdminTab("companies");
      setPaymentCompanyId(null);
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
  const navigateAdmin = (tab: AdminTab) => {
    setAdminTab(tab);
    if (tab === "payments") setPaymentCompanyId(null);
    navigate("admin");
  };
  const items = navigation.filter(
    (n) =>
      user.role !== "admin" && (user.role !== "operator" ||
      !["settings", "warehouses", "reports", "account"].includes(n.id)),
  );
  const activeCompany = companies.find((company) => company.id === companyId);
  const canSelectCompany = user.role === "admin" && companies.length > 1;
  const isAdminPage = user.role === "admin";
  function content() {
    if (isAdminPage && page === "company-detail" && activeCompany)
      return <CompanyDetail company={activeCompany} onBack={() => navigateAdmin("companies")} />;
    if (isAdminPage)
      return <Admin onCompanyDetail={(company) => { selectCompany(company.id); setAdminTab("companies"); navigate("company-detail"); }} tab={adminTab} onTabChange={setAdminTab} paymentCompanyId={paymentCompanyId} onPaymentCompanyChange={setPaymentCompanyId} />;
    if (!companyId) return <p className="notice">No tienes una empresa asignada. Consulta con el administrador.</p>;
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
    <div className={`app-shell ${collapsed ? "nav-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">Ir al contenido</a>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
      )}
      <aside ref={sidebarRef} id="app-navigation" role={open ? "dialog" : undefined} aria-modal={open ? true : undefined} aria-label="Navegación de LAHIFACT" className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-icon">
            <Layers3 size={23} />
          </span>
          <span className="brand-name">LAHI<span>FACT</span></span>
          <button
            className="mobile-close icon-button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="sidebar-label">{isAdminPage ? "ADMINISTRACIÓN SAAS" : "ESPACIO DE TRABAJO"}</p>
        <nav aria-label="Menú principal">
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-label={label}
              aria-current={!isAdminPage && page === id ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={!isAdminPage && page === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {!isAdminPage && page === id && <span className="nav-dot" />}
            </button>
          ))}
          {user.role === "admin" && (
            <>
              <button
                className={isAdminPage ? "admin-entry" : ""}
                aria-label="Panel administrador"
                title={collapsed ? "Panel administrador" : undefined}
                onClick={() => navigateAdmin("companies")}
              >
                <ShieldCheck size={19} />
                <span>Panel administrador</span>
              </button>
              {adminNavigation.map(({ id, label, icon: Icon }) => (
                <button key={id} className={isAdminPage && adminTab === id ? "active" : ""}
                  aria-label={`Administración: ${label}`} aria-current={isAdminPage && adminTab === id ? "page" : undefined}
                  title={collapsed ? label : undefined} onClick={() => navigateAdmin(id)}>
                  <Icon size={19} /><span>{label}</span>
                  {isAdminPage && adminTab === id && <span className="nav-dot" />}
                </button>
              ))}
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <ShieldCheck size={21} />
            <div>
              <strong>{isAdminPage ? "Administración del servicio" : "Conectado a tu negocio"}</strong>
              <small>{isAdminPage ? "Supervisión de empresas clientes" : "Facturación clara y organizada"}</small>
            </div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title={collapsed ? "Cerrar sesión" : undefined}
            disabled={loggingOut}
          >
            <LogOut size={18} />
            <span>{loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}</span>
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar" inert={open}>
          <div className="topbar-company">
            <button type="button" className="desktop-menu icon-button" title={collapsed ? "Expandir menú" : "Contraer menú"} aria-label={collapsed ? "Expandir menú" : "Contraer menú"} aria-expanded={!collapsed} aria-controls="app-navigation" onClick={() => setCollapsed((value) => !value)}>
              {collapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
            </button>
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir menú"
              aria-expanded={open}
              aria-controls="app-navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="mobile-brand" aria-label="LAHIFACT"><Layers3 size={22} /></span>
            <span className="company-avatar">
              {companies.find((c) => c.id === companyId)?.name.slice(0, 1) ||
                "L"}
            </span>
            <div>
              {canSelectCompany ? (
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
                <strong title={activeCompany?.name}>{activeCompany?.name || "Sin empresa seleccionada"}</strong>
              )}
              <small>
                RUC {companies.find((c) => c.id === companyId)?.ruc || "—"}
              </small>
            </div>
            {canSelectCompany && <ChevronDown size={14} className="muted" aria-hidden="true" />}
          </div>
          <UserProfile user={user} busy={loggingOut} onLogout={handleLogout} />
        </header>
        <main id="main-content" tabIndex={-1} inert={open} className="main-content" key={`${companyId}-${page}`}>
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
