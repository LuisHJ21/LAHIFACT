import { useEffect, useState } from "react";
import { Send, RefreshCw, Download } from "lucide-react";
import { useApp } from "../context";
import { api, download, errorMessage } from "../api";
import {
  PageHeader,
  useData,
  Status,
  Loading,
  ErrorBox,
  Empty,
  Pager,
} from "../components/ui";
import {
  today,
  money,
  date,
  type Invoice,
  type Page,
  type Submission,
} from "../types";
export function Summaries() {
  const { notify } = useApp();
  const [day, setDay] = useState(today());
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const {
    data: documents,
    loading,
    error,
  } = useData<Page<Invoice>>(
    `/invoices?group=summary_pending&from=${day}&to=${day}&page=${page}`,
    version,
  );
  const { data: submissions } = useData<Page<Submission>>(
    `/submissions?kind=summary&date=${day}`,
    version,
  );
  useEffect(() => {
    const timer = setInterval(() => setVersion((v) => v + 1), 15000);
    return () => clearInterval(timer);
  }, []);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      setSelected([]);
      setVersion((v) => v + 1);
      notify("Operación programada. Consulta el resultado del envío.");
    } catch (e) {
      notify(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Resumen diario"
        subtitle="Selecciona boletas y notas pendientes de una misma fecha."
        action={
          <button
            className="button primary"
            disabled={!selected.length || busy}
            onClick={() =>
              run(() =>
                api.post("/submissions", {
                  kind: "summary",
                  document_ids: selected,
                }),
              )
            }
          >
            <Send size={17} />
            Enviar {selected.length || ""} documentos
          </button>
        }
      />
      <section className="panel">
        <div className="toolbar">
          <label className="date-filter">
            Fecha de emisión
            <input
              type="date"
              max={today()}
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setSelected([]);
                setPage(1);
              }}
            />
          </label>
          <span className="pill">{documents?.total || 0} pendientes</span>
        </div>
        <ErrorBox message={error} />
        {loading && !documents ? (
          <Loading />
        ) : !documents?.data.length ? (
          <Empty title="No hay documentos pendientes para esta fecha" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Seleccionar</th>
                  <th>Comprobante</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {documents.data.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <input
                        aria-label={`Seleccionar ${i.series}-${i.number}`}
                        type="checkbox"
                        checked={selected.includes(i.id)}
                        onChange={(e) =>
                          setSelected((ids) =>
                            e.target.checked
                              ? [...ids, i.id]
                              : ids.filter((id) => id !== i.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      {i.series}-{i.number}
                    </td>
                    <td>{i.customer_snapshot.name}</td>
                    <td>
                      <Status value={i.status} />
                    </td>
                    <td>{money(i.totals.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {documents && (
          <Pager
            current={documents.current_page}
            last={documents.last_page}
            total={documents.total}
            from={documents.from}
            to={documents.to}
            onChange={setPage}
          />
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Historial de resúmenes</h2>
            <p>Puedes enviar más de un resumen por fecha.</p>
          </div>
        </div>
        {!submissions?.data.length ? (
          <Empty />
        ) : (
          submissions.data.map((s) => (
            <article key={s.id} className="submission-card">
              <div>
                <strong>{s.identifier}</strong>
                <Status value={s.status} />
              </div>
              <p>{s.message || "En cola de envío"}</p>
              <small>
                {date(s.reference_date)} · {s.document_ids.length} documentos ·{" "}
                {s.ticket ? `Ticket ${s.ticket}` : "Sin ticket"}
              </small>
              <div className="detail-actions">
                {!["accepted", "rejected"].includes(s.status) && (
                  <button
                    className="button secondary small"
                    disabled={busy}
                    onClick={() =>
                      run(() => api.post(`/submissions/${s.id}/retry`))
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
                        s.identifier + ".xml",
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
                        s.identifier + ".zip",
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
      </section>
    </>
  );
}
