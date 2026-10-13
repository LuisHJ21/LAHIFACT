<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessSubmission;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Submission;
use App\Services\QuotaService;
use App\Services\SubscriptionService;
use App\Services\SunatService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SubmissionController extends Controller
{
    public function index(Request $request): mixed
    {
        $q = Submission::where('company_id', $request->attributes->get('company')->id);
        if ($request->filled('kind')) {
            $q->where('kind', $request->input('kind'));
        }
        if ($request->filled('date')) {
            $q->whereDate('reference_date', $request->input('date'));
        }

        return $q->latest()->paginate(50);
    }

    public function store(Request $request, QuotaService $quota, SubscriptionService $subscriptions, SunatService $sunat): mixed
    {
        $data = $request->validate(['kind' => 'required|in:document,summary,voided', 'document_ids' => 'required|array|min:1|max:500',
            'document_ids.*' => 'required|integer|distinct', 'reason' => 'required_if:kind,voided|nullable|string|min:3|max:100']);
        $company = $request->attributes->get('company');
        $submission = DB::transaction(function () use ($company, $data, $quota, $subscriptions, $sunat) {
            Company::whereKey($company->id)->lockForUpdate()->firstOrFail();
            $subscriptions->assertWritable($company);
            $invoices = Invoice::where('company_id', $company->id)->whereIn('id', $data['document_ids'])->lockForUpdate()->get();
            abort_unless($invoices->count() === count($data['document_ids']), 404);
            $kind = $data['kind'];
            $first = $invoices->first();
            if ($kind === 'document') {
                if ($invoices->count() !== 1) {
                    throw ValidationException::withMessages(['document_ids' => 'Selecciona un documento para el envío individual.']);
                }
                if ($first->series[0] === 'B') {
                    $kind = 'summary';
                }
            }
            if ($invoices->pluck('issued_at')->map(fn ($d) => $d->toDateString())->unique()->count() !== 1 || $invoices->pluck('environment')->unique()->count() !== 1) {
                throw ValidationException::withMessages(['document_ids' => 'Los documentos deben tener la misma fecha de emisión y ambiente.']);
            }
            $operations = [];
            foreach ($invoices as $invoice) {
                $active = Submission::where('company_id', $company->id)->whereIn('status', ['queued', 'sending', 'pending', 'uncertain'])->get()
                    ->contains(fn ($s) => in_array($invoice->id, $s->document_ids));
                if ($active) {
                    throw ValidationException::withMessages(['document_ids' => 'Un documento seleccionado ya está en procesamiento. Consulta su estado.']);
                }
                if ($kind === 'voided') {
                    if ($invoice->status !== 'accepted' || $invoice->delivered) {
                        throw ValidationException::withMessages(['document_ids' => 'La baja requiere documento aceptado que no haya sido entregado. Para una venta entregada emite una nota de crédito.']);
                    }
                    if ($invoice->issued_at->addDays(7)->lt(today())) {
                        throw ValidationException::withMessages(['document_ids' => 'El documento está fuera del plazo de baja.']);
                    }
                    $operations[(string) $invoice->id] = ['code' => '3', 'reason' => $data['reason']];
                } else {
                    if (! in_array($invoice->status, ['draft', 'rejected'])) {
                        throw ValidationException::withMessages(['document_ids' => 'Solo se pueden enviar documentos registrados o rechazados.']);
                    }
                    $operations[(string) $invoice->id] = ['code' => '1'];
                }
                if ($kind === 'summary' && $invoice->series[0] !== 'B') {
                    throw ValidationException::withMessages(['document_ids' => 'El resumen incluye únicamente boletas y notas vinculadas a boletas.']);
                }
                if ($kind === 'summary' && (($invoice->document_type === '07' && $invoice->reason_code === '10') || ($invoice->document_type === '08' && $invoice->reason_code === '03'))) {
                    throw ValidationException::withMessages(['document_ids' => 'Este motivo de nota no se informa mediante resumen diario.']);
                }
            }
            if ($kind === 'voided' && $first->series[0] === 'B') {
                if ($invoices->contains(fn ($i) => $i->series[0] !== 'B')) {
                    throw ValidationException::withMessages(['document_ids' => 'Selecciona documentos del mismo prefijo.']);
                }
                $kind = 'summary';
            }
            $sunat->client($company, $first->environment);
            if ($data['kind'] !== 'voided') {
                $quota->reserve($company, $invoices->all());
            }
            $prefix = match ($kind) {
                'summary' => 'RC', 'voided' => 'RA', default => 'DOC'
            };
            $sequence = Submission::where('company_id', $company->id)->count() + 1;
            $identifier = $kind === 'document' ? $first->document_type.'-'.$first->series.'-'.$first->number.'-'.$sequence : $prefix.'-'.today()->format('Ymd').'-'.$sequence;
            $submission = Submission::create(['company_id' => $company->id, 'kind' => $kind, 'identifier' => $identifier,
                'environment' => $first->environment, 'reference_date' => $first->issued_at->toDateString(), 'document_ids' => $invoices->pluck('id')->all(),
                'operations' => $operations, 'next_attempt_at' => now()]);
            if ($data['kind'] !== 'voided') {
                Invoice::whereIn('id', $invoices->pluck('id'))->update(['status' => 'queued']);
            }
            ProcessSubmission::dispatch($submission->id)->afterCommit();

            return $submission;
        }, 3);

        return response()->json($submission, 201);
    }

    public function retry(Request $request, int $id): mixed
    {
        $company = $request->attributes->get('company');
        $submission = Submission::where('company_id', $company->id)->findOrFail($id);
        abort_if(in_array($submission->status, ['accepted', 'rejected']), 422, 'El envío ya tiene un resultado definitivo.');
        if (in_array($submission->status, ['queued', 'blocked'])) {
            app(SubscriptionService::class)->assertWritable($company);
            app(SunatService::class)->client($company, $submission->environment);
            $submission->update(['status' => 'queued']);
        }
        ProcessSubmission::dispatch($submission->id);

        return ['message' => 'Consulta o reintento programado.'];
    }

    public function download(Request $request, int $id, string $format): mixed
    {
        $submission = Submission::where('company_id', $request->attributes->get('company')->id)->findOrFail($id);
        $path = match ($format) {
            'xml' => $submission->xml_path, 'cdr' => $submission->cdr_path, default => abort(404)
        };
        abort_unless($path && Storage::disk('local')->exists($path), 404, 'El archivo aún no está disponible.');

        return Storage::disk('local')->download($path);
    }
}
