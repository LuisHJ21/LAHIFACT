import { useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Eye,
  Send,
  Printer,
  Trash2,
  Download,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { createRoot } from "react-dom/client";
import { api, download, errorMessage } from "../api";
import { useApp } from "../context";
import {
  useData,
  PageHeader,
  Modal,
  Loading,
  ErrorBox,
  Status,
  Empty,
  Pager,
} from "../components/ui";
import {
  money,
  date,
  today,
  documentNames,
  type Invoice,
  type Page,
  type Customer,
  type Product,
  type Series,
  type Submission,
} from "../types";

export function Invoices({ notes = false }: { notes?: boolean }) {
  const { notify } = useApp();
  const [version, setVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const params = new URLSearchParams({
    page: String(page),
    search,
    status,
    document_type: type,
    from,
    to,
    group: notes ? "notes" : "sales",
  });
  const { data, loading, error } = useData<Page<Invoice>>(
    `/invoices?${params}`,
    version,
  );
  useEffect(() => {
    const timer = setInterval(() => setVersion((v) => v + 1), 15000);
    return () => clearInterval(timer);
  }, []);
  const types = notes ? ["07", "08"] : ["01", "03"];
  return (
    <>
      <PageHeader
        title={notes ? "Notas de crédito y débito" : "Facturas y boletas"}
        subtitle={
          notes
            ? "Ajusta operaciones con referencia a un comprobante aceptado."
            : "Registra tus ventas y sigue su aceptación en SUNAT."
        }
        action={
          <button className="button primary" onClick={() => setCreate(true)}>
            <Plus size={18} />
            {notes ? "Emitir nota" : "Emitir comprobante"}
          </button>
        }
      />
      <section className="panel">
        <div className="toolbar filters">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar comprobante"
              value={search}
              placeholder="Número, RUC, DNI o cliente…"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Tipo de comprobante"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los tipos</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {documentNames[t]}
              </option>
            ))}
          </select>
          <select
            aria-label="Estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {[
              ["draft", "Registrado"],
              ["queued", "En cola"],
              ["sending", "Enviando"],
              ["pending", "Pendiente de CDR"],
              ["uncertain", "Por consultar"],
              ["blocked", "Configuración pendiente"],
              ["accepted", "Aceptado"],
              ["rejected", "Rechazado"],
              ["voided", "Anulado"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label className="date-filter">
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="date-filter">
            Hasta
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        <ErrorBox message={error} />
        {loading && !data ? (
          <Loading />
        ) : !data?.data.length ? (
          <Empty
            title="No se encontraron comprobantes"
            text="Emite un comprobante o ajusta los filtros de búsqueda."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Comprobante</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <strong>
                        {i.series}-{String(i.number).padStart(8, "0")}
                      </strong>
                      <small>
                        {documentNames[i.document_type]} ·{" "}
                        {i.environment === "beta" ? "Beta" : "Producción"}
                      </small>
                    </td>
                    <td>
                      {i.customer_snapshot.name}
                      <small>{i.customer_snapshot.document_number}</small>
                    </td>
                    <td>{date(i.issued_at)}</td>
                    <td>
                      <Status value={i.status} />
                    </td>
                    <td className="font-semibold">{money(i.totals.total)}</td>
                    <td>
                      <button
                        className="button secondary small"
                        onClick={() => setSelected(i.id)}
                      >
                        <Eye size={15} />
                        Ver
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
      {create && (
        <InvoiceForm
          notes={notes}
          onClose={() => setCreate(false)}
          onCreated={(id) => {
            setCreate(false);
            setSelected(id);
            setVersion((v) => v + 1);
            notify(
              "Comprobante registrado. Puedes revisar el resumen y enviarlo.",
            );
          }}
        />
      )}
      {selected && (
        <InvoiceDetail
          id={selected}
          onClose={() => {
            setSelected(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}

type Cart = {
  product_id: number;
  quantity: string;
  price: string;
  discount_percent: string;
};
function InvoiceForm({
  notes,
  onClose,
  onCreated,
}: {
  notes: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const { catalogs } = useApp();
  const [type, setType] = useState(notes ? "07" : "01");
  const [customerId, setCustomerId] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [issuedAt, setIssuedAt] = useState(today());
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<Cart[]>([]);
  const [knownProducts, setKnownProducts] = useState<Record<number, Product>>(
    {},
  );
  const [globalDiscount, setGlobalDiscount] = useState("0");
  const [referenceId, setReferenceId] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data: customers } = useData<Page<Customer>>(
    `/customers?per_page=500&search=${encodeURIComponent(customerSearch)}`,
  );
  const { data: products } = useData<Page<Product>>(
    `/products?per_page=500&search=${encodeURIComponent(productSearch)}`,
  );
  const { data: series } = useData<Page<Series>>("/series?per_page=500");
  const { data: references } = useData<Page<Invoice>>(
    `/invoices?status=accepted&group=sales&per_page=500&customer_id=${customerId}`,
    Number(customerId),
  );
  const reference = references?.data.find((r) => r.id === Number(referenceId));
  useEffect(() => {
    if (products)
      setKnownProducts((p) => ({
        ...p,
        ...Object.fromEntries(
          products.data.map((product) => [product.id, product]),
        ),
      }));
  }, [products]);
  const visibleSeries =
    series?.data.filter(
      (s) =>
        s.document_type === type &&
        (!reference || s.code[0] === reference.series[0]),
    ) || [];
  const summary = cart.reduce(
    (totals, item) => {
      const product = knownProducts[item.product_id];
      const final =
        Number(item.quantity) *
        Number(item.price) *
        (1 - Number(item.discount_percent) / 100) *
        (1 - Number(globalDiscount) / 100);
      const base = product?.tax_code === "10" ? final / 1.18 : final;
      return {
        total: totals.total + final,
        tax: totals.tax + final - base,
        base: totals.base + base,
      };
    },
    { total: 0, tax: 0, base: 0 },
  );
  function selectReference(id: string) {
    setReferenceId(id);
    setSeriesId("");
    const ref = references?.data.find((r) => r.id === Number(id));
    if (ref) {
      setCart(
        ref.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          discount_percent: item.discount_percent || "0",
        })),
      );
      setKnownProducts((p) => ({
        ...p,
        ...Object.fromEntries(
          ref.items.map((item) => [
            item.product_id,
            {
              id: item.product_id,
              name: item.name,
              code: item.code,
              price: item.price,
              tax_code: item.tax_code,
              tax_rate: item.tax_rate,
              unit_code: item.unit_code,
              kind: "product",
            },
          ]),
        ),
      }));
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<Invoice>("/invoices", {
        document_series_id: Number(seriesId || visibleSeries[0]?.id),
        customer_id: Number(customerId),
        issued_at: issuedAt,
        items: cart,
        global_discount_percent: globalDiscount,
        ...(notes
          ? {
              reference_id: Number(referenceId),
              reason_code: reasonCode,
              reason,
            }
          : {}),
      });
      onCreated(data.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={notes ? "Emitir nota electrónica" : "Emitir factura o boleta"}
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="modal-body" onSubmit={submit}>
        <ErrorBox message={error} />
        <div className="form-grid three">
          <label>
            Tipo de comprobante
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setSeriesId("");
                setReasonCode("");
              }}
            >
              {(notes ? ["07", "08"] : ["01", "03"]).map((t) => (
                <option key={t} value={t}>
                  {documentNames[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Serie
            <select
              required
              value={seriesId || String(visibleSeries[0]?.id || "")}
              onChange={(e) => setSeriesId(e.target.value)}
            >
              <option value="">Seleccionar serie</option>
              {visibleSeries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · próximo {s.next_number}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha de emisión
            <input
              type="date"
              required
              max={today()}
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
          </label>
        </div>
        <div className="form-grid mt-5">
          <label>
            Buscar cliente
            <input
              value={customerSearch}
              placeholder="RUC, DNI o nombre"
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </label>
          <label>
            Cliente
            <select
              value={customerId}
              required
              onChange={(e) => {
                setCustomerId(e.target.value);
                setReferenceId("");
              }}
            >
              <option value="">Seleccionar cliente</option>
              {customers?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.document_number} · {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {notes && (
          <div className="note-fields">
            <label>
              Comprobante de referencia
              <select
                required
                value={referenceId}
                onChange={(e) => selectReference(e.target.value)}
              >
                <option value="">Seleccionar comprobante aceptado</option>
                {references?.data
                  .filter((r) => r.customer_id === Number(customerId))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.series}-{r.number} · {money(r.totals.total)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Motivo SUNAT
              <select
                required
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
              >
                <option value="">Seleccionar motivo</option>
                {(catalogs[type === "07" ? "09" : "10"] || [])
                  .filter((c) => !["13"].includes(c.code))
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.description}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Descripción del motivo
              <textarea
                required
                maxLength={250}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </div>
        )}
        <div className="cart-heading">
          <h3>Detalle de la venta</h3>
          <span className="pill">{cart.length} ítems</span>
        </div>
        <label className="search">
          <Search size={18} />
          <input
            value={productSearch}
            placeholder="Buscar producto por código o descripción…"
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </label>
        <div className="product-picker">
          {products?.data.slice(0, 8).map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                setKnownProducts((k) => ({ ...k, [p.id]: p }));
                setCart((items) => [
                  ...items,
                  {
                    product_id: p.id,
                    quantity: "1",
                    price: p.price,
                    discount_percent: "0",
                  },
                ]);
              }}
            >
              <Plus size={15} />
              <span>
                {p.name}
                <small>{p.code}</small>
              </span>
              <strong>{money(p.price)}</strong>
            </button>
          ))}
        </div>
        {!cart.length ? (
          <Empty
            title="Añade productos o servicios"
            text="Selecciona un producto para empezar el detalle."
          />
        ) : (
          <div className="table-wrap">
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio final</th>
                  <th>Descuento %</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <strong>{knownProducts[item.product_id]?.name}</strong>
                      <small>{knownProducts[item.product_id]?.unit_code}</small>
                    </td>
                    {(["quantity", "price", "discount_percent"] as const).map(
                      (key) => (
                        <td key={key}>
                          <input
                            aria-label={`${key} ${index + 1}`}
                            type="number"
                            required
                            step={
                              key === "discount_percent" ? ".01" : ".000001"
                            }
                            min={key === "discount_percent" ? "0" : ".000001"}
                            max={key === "discount_percent" ? "100" : undefined}
                            value={item[key]}
                            onChange={(e) =>
                              setCart((items) =>
                                items.map((i, n) =>
                                  n === index
                                    ? { ...i, [key]: e.target.value }
                                    : i,
                                ),
                              )
                            }
                          />
                        </td>
                      ),
                    )}
                    <td>
                      {money(
                        Number(item.quantity) *
                          Number(item.price) *
                          (1 - Number(item.discount_percent) / 100),
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Quitar producto"
                        onClick={() =>
                          setCart((items) =>
                            items.filter((_, n) => n !== index),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="sale-summary">
          <div>
            <label>
              Descuento global (%)
              <input
                type="number"
                min="0"
                max="100"
                step=".01"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(e.target.value)}
              />
            </label>
            <span className="pill mt-4">Forma de pago: contado · PEN</span>
            <p className="muted mt-3">
              Vista previa. El servidor verifica importes y redondeos al
              registrar.
            </p>
          </div>
          <dl>
            <div>
              <dt>Subtotal sin impuestos</dt>
              <dd>{money(summary.base)}</dd>
            </div>
            <div>
              <dt>IGV</dt>
              <dd>{money(summary.tax)}</dd>
            </div>
            <div className="summary-total">
              <dt>Total</dt>
              <dd>{money(summary.total)}</dd>
            </div>
          </dl>
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button disabled={busy || !cart.length} className="button primary">
            <CheckCircle2 size={17} />
            {busy ? "Registrando…" : "Registrar comprobante"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function InvoiceDetail({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const { notify } = useApp();
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const {
    data,
    loading,
    error: loadError,
  } = useData<{ invoice: Invoice; submissions: Submission[] }>(
    `/invoices/${id}`,
    version,
  );
  useEffect(() => {
    const timer = setInterval(() => setVersion((v) => v + 1), 8000);
    return () => clearInterval(timer);
  }, []);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const invoice = data?.invoice;
  return (
    <Modal
      title={
        invoice
          ? `${documentNames[invoice.document_type]} ${invoice.series}-${String(invoice.number).padStart(8, "0")}`
          : "Detalle de comprobante"
      }
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="modal-body">
        <ErrorBox message={error || loadError} />
        {loading && !data ? (
          <Loading />
        ) : (
          invoice && (
            <>
              <div className="detail-top">
                <div>
                  <Status value={invoice.status} />
                  <p className="muted mt-3">
                    {date(invoice.issued_at)} · Pago al contado ·{" "}
                    {invoice.environment === "beta"
                      ? "SUNAT beta"
                      : "Producción"}
                  </p>
                </div>
                <strong className="detail-total">
                  {money(invoice.totals.total)}
                </strong>
              </div>
              <div className="detail-customer">
                <strong>{invoice.customer_snapshot.name}</strong>
                <span>{invoice.customer_snapshot.document_number}</span>
                <small>{invoice.customer_snapshot.address}</small>
              </div>
              {invoice.reason && (
                <div className="notice">
                  Motivo {invoice.reason_code}: {invoice.reason}
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>IGV</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, n) => (
                      <tr key={n}>
                        <td>
                          {item.name}
                          <small>
                            {item.code} · {item.unit_code}
                          </small>
                        </td>
                        <td>{item.quantity}</td>
                        <td>{money(item.price)}</td>
                        <td>{money(item.tax)}</td>
                        <td>{money(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="detail-totals">
                <span>Descuentos: {money(invoice.totals.discount)}</span>
                <span>Subtotal: {money(invoice.totals.subtotal)}</span>
                <span>IGV: {money(invoice.totals.tax)}</span>
                <strong>Total: {money(invoice.totals.total)}</strong>
              </div>
              <div className="detail-actions">
                {["draft", "rejected"].includes(invoice.status) && (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      action(() =>
                        api.post("/submissions", {
                          kind: "document",
                          document_ids: [id],
                        }),
                      )
                    }
                  >
                    <Send size={16} />
                    Enviar a SUNAT
                  </button>
                )}
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => action(() => printInvoice(invoice, "a4"))}
                >
                  <Printer size={16} />
                  Imprimir A4
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => action(() => printInvoice(invoice, "ticket"))}
                >
                  <Printer size={16} />
                  Ticket 80 mm
                </button>
                {!invoice.delivered && (
                  <button
                    disabled={busy}
                    className="button secondary"
                    onClick={() =>
                      action(() => api.post(`/invoices/${id}/deliver`))
                    }
                  >
                    Marcar entregado al cliente
                  </button>
                )}
                {invoice.status === "accepted" && !invoice.delivered && (
                  <button
                    className="button danger"
                    disabled={busy}
                    onClick={() => {
                      const reason = prompt(
                        "Motivo de baja (documento no entregado al cliente):",
                      );
                      if (reason)
                        action(() =>
                          api.post("/submissions", {
                            kind: "voided",
                            document_ids: [id],
                            reason,
                          }),
                        );
                    }}
                  >
                    <Trash2 size={16} />
                    Dar de baja
                  </button>
                )}
              </div>
              <h3 className="mt-6">Seguimiento SUNAT</h3>
              {!data?.submissions.length ? (
                <p className="muted mt-3">
                  Todavía no se ha enviado este comprobante.
                </p>
              ) : (
                data.submissions.map((s) => (
                  <article key={s.id} className="submission-card">
                    <div>
                      <strong>{s.identifier}</strong>
                      <Status value={s.status} />
                    </div>
                    <p>{s.message || "Envío programado."}</p>
                    {s.ticket && <small>Ticket: {s.ticket}</small>}
                    <div className="detail-actions">
                      {!["accepted", "rejected"].includes(s.status) && (
                        <button
                          disabled={busy}
                          className="button secondary small"
                          onClick={() =>
                            action(() => api.post(`/submissions/${s.id}/retry`))
                          }
                        >
                          <RefreshCw size={14} />
                          Consultar / reintentar
                        </button>
                      )}
                      {s.xml_path && (
                        <button
                          className="button secondary small"
                          onClick={() =>
                            download(
                              `/submissions/${s.id}/xml`,
                              `${s.identifier}.xml`,
                            ).catch((e) => notify(errorMessage(e), true))
                          }
                        >
                          <Download size={14} />
                          XML
                        </button>
                      )}
                      {s.cdr_path && (
                        <button
                          className="button secondary small"
                          onClick={() =>
                            download(
                              `/submissions/${s.id}/cdr`,
                              `R-${s.identifier}.zip`,
                            ).catch((e) => notify(errorMessage(e), true))
                          }
                        >
                          <Download size={14} />
                          CDR
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </>
          )
        )}
      </div>
    </Modal>
  );
}

async function printInvoice(invoice: Invoice, format: "a4" | "ticket") {
  const { data } = await api.get(`/invoices/${invoice.id}/qr`, {
    responseType: "blob",
  });
  const qrUrl = URL.createObjectURL(data);
  const frame = document.createElement("iframe");
  frame.style.cssText =
    "position:fixed;left:-10000px;width:1000px;height:1000px";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const style = doc.createElement("style");
  style.textContent = `@page{size:${format === "a4" ? "A4" : "80mm auto"};margin:${format === "a4" ? "15mm" : "3mm"}}body{font-family:Arial,sans-serif;font-size:${format === "a4" ? "12px" : "10px"};color:#111}main{max-width:${format === "a4" ? "100%" : "74mm"};margin:auto}h1{font-size:20px}h2{font-size:16px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:6px 2px;text-align:left;border-bottom:1px solid #ddd}dl{text-align:right}small{display:block}img{width:110px;height:110px}`;
  doc.head.appendChild(style);
  const container = doc.createElement("div");
  doc.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <main>
      <h1>{invoice.company_snapshot.name}</h1>
      <p>
        RUC {invoice.company_snapshot.ruc}
        <br />
        {invoice.company_snapshot.address}
      </p>
      <h2>{documentNames[invoice.document_type].toUpperCase()} ELECTRÓNICA</h2>
      <p>
        {invoice.series}-{String(invoice.number).padStart(8, "0")}
        <br />
        Fecha: {date(invoice.issued_at)}
        <br />
        Moneda: soles · Pago al contado
      </p>
      {invoice.environment === "beta" && (
        <strong>PRUEBA SUNAT BETA — SIN VALIDEZ TRIBUTARIA</strong>
      )}
      <p>
        {invoice.customer_snapshot.name}
        <br />
        Documento: {invoice.customer_snapshot.document_number}
        <br />
        {invoice.customer_snapshot.address}
      </p>
      {invoice.reason && <p>Motivo: {invoice.reason}</p>}
      <table>
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((i, n) => (
            <tr key={n}>
              <td>
                {i.name}
                <small>{i.unit_code}</small>
              </td>
              <td>{i.quantity}</td>
              <td>{money(i.price)}</td>
              <td>{money(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl>
        <p>Descuentos: {money(invoice.totals.discount)}</p>
        <p>Op. gravadas: {money(invoice.totals.taxable)}</p>
        <p>Op. exoneradas: {money(invoice.totals.exonerated)}</p>
        <p>Op. inafectas: {money(invoice.totals.unaffected)}</p>
        <p>IGV: {money(invoice.totals.tax)}</p>
        <h2>TOTAL: {money(invoice.totals.total)}</h2>
      </dl>
      <img
        src={qrUrl}
        alt="QR del comprobante"
        onLoad={() => {
          setTimeout(() => {
            frame.contentWindow?.print();
            setTimeout(() => {
              root.unmount();
              frame.remove();
              URL.revokeObjectURL(qrUrl);
            }, 30000);
          }, 200);
        }}
      />
      <p>
        Representación impresa del comprobante electrónico.
        <br />
        Estado:{" "}
        {invoice.status === "accepted"
          ? "Aceptado por SUNAT"
          : "Pendiente de aceptación o rechazado"}
      </p>
    </main>,
  );
}
