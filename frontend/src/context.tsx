import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, errorMessage } from "./api";
import type { Catalogs, Company, User } from "./types";

type Context = {
  user: User | null;
  companyId: number | null;
  companies: Company[];
  catalogs: Catalogs;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectCompany: (id: number) => void;
  reloadCompanies: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
};
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(
    Number(sessionStorage.getItem("company")) || null,
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  function notify(message: string, error = false) {
    setToast({ message, error });
  }
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(id);
  }, [toast]);
  function selectCompany(id: number) {
    api.defaults.headers.common["X-Company-Id"] = id;
    sessionStorage.setItem("company", String(id));
    setCompanyId(id);
  }
  async function reloadCompanies() {
    const { data } = await api.get("/admin");
    setCompanies(data.companies);
  }
  async function loadUser(u: User) {
    setUser(u);
    const { data } = await api.get<Catalogs>("/catalogs");
    setCatalogs(data);
    if (u.role === "admin") {
      const { data: admin } = await api.get("/admin");
      setCompanies(admin.companies);
      const chosen =
        admin.companies.find((c: Company) => c.id === companyId) ||
        admin.companies[0];
      if (chosen) selectCompany(chosen.id);
    } else {
      setCompanies(u.company ? [u.company] : []);
      selectCompany(u.company_id!);
    }
  }
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    api
      .get<User>("/auth/me")
      .then(({ data }) => loadUser(data))
      .catch((error) => {
        sessionStorage.removeItem("token");
        delete api.defaults.headers.common.Authorization;
        setUser(null);
        notify(errorMessage(error), true);
      })
      .finally(() => setLoading(false));
  }, []);
  async function login(email: string, password: string) {
    const { data } = await api.post("/auth/login", { email, password });
    sessionStorage.setItem("token", data.token);
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    await loadUser(data.user);
  }
  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      sessionStorage.clear();
      delete api.defaults.headers.common.Authorization;
      delete api.defaults.headers.common["X-Company-Id"];
      setUser(null);
      setCompanyId(null);
      setCatalogs({});
      setCompanies([]);
    }
  }
  return (
    <AppContext.Provider
      value={{
        user,
        companyId,
        companies,
        catalogs,
        loading,
        login,
        logout,
        selectCompany,
        reloadCompanies,
        notify,
      }}
    >
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role="status"
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Cerrar aviso">
            ×
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppProvider requerido");
  return ctx;
}
