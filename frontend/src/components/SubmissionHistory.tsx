import { useState } from "react";
import { Download } from "lucide-react";
import { useApp } from "../context";
import { download, errorMessage } from "../api";
import { date, type Page, type Submission } from "../types";
import { useData, PageHeader, Loading, ErrorBox, Empty, Pager, Status } from "./ui";

const kinds: Record<string, string> = { document: "Comprobante", summary: "Resumen diario", voided: "Comunicación de baja" };

export function SubmissionHistory() {
  const { notify } = useApp();
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState("");
  const [day, setDay] = useState("");
  const [version, setVersion] = useState(0);
  const params = new URLSearchParams({ page: String(page), kind, date: day });
  const { data, loading, error } = useData<Page<Submission>>(`/submissions?${params}`, version);
  return <>
    <PageHeader title="Historial de envíos SUNAT" subtitle="Consulta resúmenes, comprobantes y comunicaciones de baja ya registrados." />
    <section className="panel">
      <div className="toolbar filters">
        <label>Tipo de envío<select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}><option value="">Todos los envíos</option>{Object.entries(kinds).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Fecha de referencia<input type="date" value={day} onChange={(event) => { setDay(event.target.value); setPage(1); }} /></label>
        {(kind || day) && <button className="button secondary" onClick={() => { setKind(""); setDay(""); setPage(1); }}>Limpiar filtros</button>}
      </div>
      <ErrorBox message={error} onRetry={() => setVersion((value) => value + 1)} />
      {loading ? <Loading /> : error ? null : !data?.data.length ? <Empty title="No se encontraron envíos" text="Esta empresa no tiene envíos para los filtros seleccionados." /> : <>
        {data.data.map((submission) => <article className="submission-card" key={submission.id}>
          <div><strong>{submission.identifier}</strong><Status value={submission.status} /></div>
          <p>{submission.message || "Sin respuesta registrada."}</p>
          <small>{kinds[submission.kind] || submission.kind} · {date(submission.reference_date)} · {submission.document_ids.length} documentos · {submission.environment === "beta" ? "SUNAT beta" : "Producción"}</small>
          {submission.ticket && <p>Ticket: {submission.ticket}</p>}
          {submission.response_code && <p>Código de respuesta: {submission.response_code}</p>}
          <div className="detail-actions">
            {submission.xml_path && <button className="button secondary small" onClick={() => download(`/submissions/${submission.id}/xml`, `${submission.identifier}.xml`).catch((e) => notify(errorMessage(e), true))}><Download size={16} />XML</button>}
            {submission.cdr_path && <button className="button secondary small" onClick={() => download(`/submissions/${submission.id}/cdr`, `R-${submission.identifier}.zip`).catch((e) => notify(errorMessage(e), true))}><Download size={16} />CDR</button>}
          </div>
        </article>)}
        <Pager current={data.current_page} last={data.last_page} total={data.total} from={data.from} to={data.to} onChange={setPage} />
      </>}
    </section>
  </>;
}
