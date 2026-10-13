import { useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Pencil,
  Package,
  Users,
  Warehouse,
  MapPin,
  Hash,
} from "lucide-react";
import { useApp } from "../context";
import { api, errorMessage } from "../api";
import {
  useData,
  PageHeader,
  Modal,
  Loading,
  ErrorBox,
  Empty,
  Pager,
} from "../components/ui";
import { money, documentNames, type Page } from "../types";

type Row = Record<string, string | number | null>;
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: [string, string][];
  required?: boolean;
  maxLength?: number;
};
function ProductImage({ id }: { id: number }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    api
      .get(`/products/${id}/image`, {
        responseType: "blob",
        signal: controller.signal,
      })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url ? (
    <img
      src={url}
      alt="Imagen del producto"
      className="h-28 w-28 rounded-lg border border-slate-200 object-cover mt-3"
    />
  ) : null;
}
export function Directory({
  resource,
}: {
  resource:
    "customers" | "products" | "warehouses" | "establishments" | "series";
}) {
  const { catalogs, notify } = useApp();
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const {
    data,
    loading,
    error: loadError,
  } = useData<Page<Row>>(
    `/${resource}?search=${encodeURIComponent(search)}&page=${page}`,
    version,
  );
  const { data: establishments } = useData<Page<Row>>(
    "/establishments?per_page=500",
  );
  const catalog = (id: string): [string, string][] =>
    (catalogs[id] || []).map((c) => [c.code, `${c.code} · ${c.description}`]);
  const config = {
    customers: {
      title: "Clientes",
      subtitle: "Tu directorio de clientes, siempre a mano.",
      icon: Users,
      fields: [
        {
          key: "document_type",
          label: "Tipo de documento",
          options: catalog("06"),
        },
        { key: "document_number", label: "Número de documento", maxLength: 20 },
        { key: "name", label: "Razón social o nombre", maxLength: 255 },
        { key: "address", label: "Dirección", required: false },
        { key: "email", label: "Correo", type: "email", required: false },
        { key: "phone", label: "Teléfono", required: false },
      ],
    },
    products: {
      title: "Productos y servicios",
      subtitle: "Precios finales con impuestos incluidos.",
      icon: Package,
      fields: [
        { key: "name", label: "Nombre del producto o servicio" },
        {
          key: "kind",
          label: "Tipo",
          options: [
            ["product", "Producto"],
            ["service", "Servicio"],
          ],
        },
        { key: "price", label: "Precio final (S/)", type: "number" },
        {
          key: "tax_code",
          label: "Afectación tributaria",
          options: [
            ["10", "Gravado · 18 %"],
            ["20", "Exonerado"],
            ["30", "Inafecto"],
          ],
        },
        { key: "unit_code", label: "Unidad de medida", options: catalog("03") },
      ],
    },
    warehouses: {
      title: "Almacenes",
      subtitle: "Organiza los almacenes de tu empresa.",
      icon: Warehouse,
      fields: [
        { key: "name", label: "Nombre" },
        { key: "address", label: "Dirección" },
      ],
    },
    establishments: {
      title: "Establecimientos",
      subtitle: "Domicilio fiscal y locales anexos.",
      icon: MapPin,
      fields: [
        { key: "code", label: "Código SUNAT (4 dígitos)", maxLength: 4 },
        { key: "name", label: "Nombre" },
        { key: "address", label: "Dirección" },
      ],
    },
    series: {
      title: "Series de comprobantes",
      subtitle: "Correlativos independientes por tipo de documento.",
      icon: Hash,
      fields: [
        {
          key: "document_type",
          label: "Tipo de comprobante",
          options: Object.entries(documentNames),
        },
        { key: "code", label: "Serie (4 caracteres)", maxLength: 4 },
        {
          key: "establishment_id",
          label: "Establecimiento",
          options:
            establishments?.data.map((e) => [String(e.id), String(e.name)]) ||
            [],
        },
      ],
    },
  }[resource] as {
    title: string;
    subtitle: string;
    icon: typeof Users;
    fields: Field[];
  };
  function open(row: Row = {}) {
    setEditing(row);
    setError("");
    setFile(null);
    setForm({
      document_type: resource === "series" ? "01" : "6",
      kind: "product",
      tax_code: "10",
      unit_code: "NIU",
      ...row,
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {};
      config.fields.forEach((f) => {
        payload[f.key] = form[f.key] ?? "";
      });
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) =>
          fd.append(key, String(value)),
        );
        fd.append("image", file);
        if (editing?.id) fd.append("_method", "PUT");
        await api.post(
          `/${resource}${editing?.id ? "/" + editing.id : ""}`,
          fd,
        );
      } else if (editing?.id)
        await api.put(`/${resource}/${editing.id}`, payload);
      else await api.post(`/${resource}`, payload);
      setEditing(null);
      setVersion((v) => v + 1);
      notify("Registro guardado correctamente.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        action={
          <button className="button primary" onClick={() => open()}>
            <Plus size={18} />
            Nuevo registro
          </button>
        }
      />
      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar registros"
              placeholder="Buscar por nombre, código o documento…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <span className="pill">{data?.total || 0} registros</span>
        </div>
        <ErrorBox message={loadError} />
        {loading ? (
          <Loading />
        ) : !data?.data.length ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{resource === "series" ? "Serie" : "Nombre"}</th>
                  <th>Información</th>
                  {resource === "products" && <th>Precio final</th>}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="cell-title">
                        <span className="directory-icon">
                          <config.icon size={18} />
                        </span>
                        <div>
                          <strong>{row.name || row.code}</strong>
                          <small>
                            {resource === "customers"
                              ? row.document_number
                              : resource === "products"
                                ? row.code
                                : row.address}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {resource === "products" ? (
                        <>
                          <span>
                            {row.kind === "service" ? "Servicio" : "Producto"} ·{" "}
                            {row.unit_code}
                          </span>
                          <small>
                            {
                              {
                                "10": "Gravado 18 %",
                                "20": "Exonerado",
                                "30": "Inafecto",
                              }[String(row.tax_code)]
                            }
                          </small>
                        </>
                      ) : resource === "series" ? (
                        <>
                          <span>
                            {documentNames[String(row.document_type)]}
                          </span>
                          <small>
                            Siguiente correlativo: {row.next_number}
                          </small>
                        </>
                      ) : resource === "customers" ? (
                        <>
                          <span>{row.email || "Sin correo"}</span>
                          <small>{row.phone}</small>
                        </>
                      ) : (
                        row.code || "Almacén"
                      )}{" "}
                    </td>
                    {resource === "products" && (
                      <td className="font-semibold">
                        {money(String(row.price))}
                      </td>
                    )}
                    <td>
                      <button
                        className="button secondary small"
                        onClick={() => open(row)}
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
        {data && (
          <Pager
            current={data.current_page}
            last={data.last_page}
            total={data.total}
            onChange={setPage}
          />
        )}
      </section>
      {editing && (
        <Modal
          title={editing.id ? "Editar registro" : "Nuevo registro"}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form onSubmit={submit} className="modal-body">
            <ErrorBox message={error} />
            <div className="form-grid">
              {config.fields.map((field) => (
                <label key={field.key}>
                  {field.label}
                  {field.options ? (
                    <select
                      required={field.required !== false}
                      value={String(form[field.key] ?? "")}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          [field.key]: e.target.value,
                          ...(field.key === "kind"
                            ? {
                                unit_code:
                                  e.target.value === "service" ? "ZZ" : "NIU",
                              }
                            : {}),
                        }));
                      }}
                    >
                      <option value="">Seleccionar…</option>
                      {field.options.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      step={field.type === "number" ? "0.000001" : undefined}
                      min={field.type === "number" ? "0.01" : undefined}
                      maxLength={field.maxLength || 255}
                      required={field.required !== false}
                      value={String(form[field.key] ?? "")}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [field.key]: e.target.value }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            {resource === "products" && (
              <label>
                Imagen referencial
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <small>Máximo 2 MB. El código se genera automáticamente.</small>
                {editing.image_path && <ProductImage id={Number(editing.id)} />}
              </label>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Guardando…" : "Guardar registro"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
