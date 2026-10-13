<?php

namespace App\Jobs;

use App\Models\Invoice;
use App\Models\Submission;
use App\Services\QuotaService;
use App\Services\SubscriptionService;
use App\Services\SunatService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProcessSubmission implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public int $tries = 5;

    public int $timeout = 75;

    public function __construct(public int $submissionId) {}

    /**
     * Execute the job.
     */
    public function handle(SunatService $sunat, QuotaService $quota, SubscriptionService $subscriptions): void
    {
        $lock = Cache::lock('submission:'.$this->submissionId, 100);
        if (! $lock->get()) {
            return;
        }
        try {
            $submission = Submission::findOrFail($this->submissionId);
            if (in_array($submission->status, ['accepted', 'rejected', 'blocked'])) {
                return;
            }
            $wasUncertain = in_array($submission->status, ['sending', 'uncertain', 'pending']);
            if (! $wasUncertain) {
                if ($subscriptions->isSuspended($submission->company)) {
                    $submission->update(['message' => 'Servicio suspendido: envío en espera.', 'next_attempt_at' => now()->addHour()]);

                    return;
                }
                $sunat->client($submission->company, $submission->environment);
                $this->progress($submission, ['status' => 'sending', 'attempts' => $submission->attempts + 1]);
                $result = $sunat->send($submission);
            } else {
                $result = $sunat->consult($submission);
            }
            if (! $result) {
                $message = 'Resultado incierto. La reserva se mantiene; se consulta el estado antes de reenviar.';
                if ($submission->environment === 'beta' && ! $submission->ticket) {
                    $message .= ' En beta, sin ticket, la consulta de CDR no está disponible.';
                }
                $this->progress($submission, ['status' => 'uncertain', 'message' => $message, 'next_attempt_at' => now()->addHour()]);

                return;
            }
            $cdr = method_exists($result, 'getCdrResponse') ? $result->getCdrResponse() : null;
            if ($cdr) {
                $accepted = (string) $cdr->getCode() === '0';
                $path = 'sunat/'.$submission->company_id.'/'.$submission->environment.'/R-'.$submission->identifier.'.zip';
                Storage::disk('local')->put($path, $result->getCdrZip());
                DB::transaction(function () use ($submission, $accepted, $cdr, $path, $quota) {
                    foreach (Invoice::where('company_id', $submission->company_id)->whereIn('id', $submission->document_ids)->get() as $invoice) {
                        $isVoid = $submission->kind === 'voided' || ($submission->operations[(string) $invoice->id]['code'] ?? '1') === '3';
                        if ($accepted && $isVoid) {
                            $invoice->update(['status' => 'voided']);
                        } elseif ($accepted) {
                            $quota->accept($invoice);
                        } elseif (! $isVoid) {
                            $quota->reject($invoice);
                        }
                    }
                    $submission->update(['status' => $accepted ? 'accepted' : 'rejected', 'cdr_path' => $path, 'response_code' => (string) $cdr->getCode(),
                        'message' => $cdr->getDescription().' '.implode(' ', $cdr->getNotes() ?? []), 'next_attempt_at' => null]);
                });

                return;
            }
            if ($result->isSuccess() && method_exists($result, 'getTicket') && $result->getTicket()) {
                $this->progress($submission, ['status' => 'pending', 'ticket' => $result->getTicket(), 'message' => 'Ticket recibido; pendiente de CDR.', 'next_attempt_at' => now()->addMinute()]);

                return;
            }
            $error = $result->getError();
            $code = $error ? (string) $error->getCode() : '';
            $message = $error ? $error->getMessage() : 'SUNAT aún no devolvió un CDR.';
            $uncertainCodes = ['1033', '2102', '2109', '2153', '2165', '2223', '2282', '2317', '2323', '2324', '2403'];
            if (! $wasUncertain && preg_match('/^\d{4}$/', $code) && (int) $code >= 2000 && (int) $code < 4000 && ! in_array($code, $uncertainCodes)) {
                foreach (Invoice::whereIn('id', $submission->document_ids)->get() as $invoice) {
                    if ($submission->kind !== 'voided' && ($submission->operations[(string) $invoice->id]['code'] ?? '1') !== '3') {
                        $quota->reject($invoice);
                    }
                }
                $submission->update(['status' => 'rejected', 'response_code' => $code, 'message' => $message, 'next_attempt_at' => null]);
            } else {
                $retrySafe = ! $wasUncertain && in_array($code, ['0100', '0106', '0107']);
                $this->progress($submission, ['status' => $retrySafe ? 'queued' : ($submission->ticket ? 'pending' : 'uncertain'), 'response_code' => $code,
                    'message' => $message, 'next_attempt_at' => now()->addSeconds(min(3600, 60 * 2 ** min($submission->attempts, 5)))]);
            }
        } catch (ValidationException $e) {
            if ($submission = Submission::find($this->submissionId)) {
                $this->progress($submission, ['status' => 'blocked', 'message' => implode(' ', Arr::flatten($e->errors())), 'next_attempt_at' => null]);
            }
        } catch (\Throwable $e) {
            if ($submission = Submission::find($this->submissionId)) {
                $this->progress($submission, ['status' => 'uncertain', 'message' => 'Falla de conexión o procesamiento. Se consultará el estado antes de reenviar.', 'next_attempt_at' => now()->addMinutes(5)]);
            }
            report($e);
        } finally {
            $lock->release();
        }
    }

    private function progress(Submission $submission, array $values): void
    {
        DB::transaction(function () use ($submission, $values) {
            $submission->update($values);
            Invoice::where('company_id', $submission->company_id)->whereIn('id', $submission->document_ids)
                ->whereNull('accepted_at')->where('status', '!=', 'voided')->update(['status' => $values['status']]);
        });
    }
}
