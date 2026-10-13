<?php

namespace App\Console\Commands;

use App\Jobs\ProcessSubmission;
use App\Models\Company;
use App\Models\Submission;
use App\Services\SubscriptionService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

#[Signature('billing:reconcile')]
#[Description('Renueva periodos y programa consultas de envíos pendientes')]
class ReconcileBilling extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(SubscriptionService $service): int
    {
        foreach (Company::cursor() as $company) {
            try {
                $service->current($company);
            } catch (ValidationException $e) {
                continue;
            }
        }
        foreach (Submission::whereIn('status', ['queued', 'sending', 'pending', 'uncertain'])->where(fn ($q) => $q->where('next_attempt_at', '<=', now())->orWhereNull('next_attempt_at'))->get() as $submission) {
            ProcessSubmission::dispatch($submission->id);
            $submission->update(['next_attempt_at' => now()->addMinutes(5)]);
        }
        $this->info('Periodos y consultas reconciliados.');

        return self::SUCCESS;
    }
}
