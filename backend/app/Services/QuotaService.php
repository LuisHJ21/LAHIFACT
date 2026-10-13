<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Invoice;
use App\Models\QuotaEntry;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuotaService
{
    /**
     * Create a new class instance.
     */
    public function __construct(private SubscriptionService $subscriptions) {}

    public function reserve(Company $company, array $invoices): void
    {
        DB::transaction(function () use ($company, $invoices) {
            Company::whereKey($company->id)->lockForUpdate()->firstOrFail();
            $period = $this->subscriptions->current($company);
            foreach ($invoices as $invoice) {
                if (! in_array($invoice->document_type, ['01', '03'])) {
                    continue;
                }
                $entry = QuotaEntry::where('invoice_id', $invoice->id)->first();
                if ($entry && in_array($entry->status, ['reserved', 'consumed'])) {
                    continue;
                }
                $used = QuotaEntry::where('billing_period_id', $period->id)->whereIn('status', ['reserved', 'consumed'])->count();
                if ($used >= $period->quota) {
                    throw ValidationException::withMessages(['quota' => 'No hay cupos disponibles. Puedes registrar comprobantes, pero no enviarlos a SUNAT.']);
                }
                QuotaEntry::updateOrCreate(['invoice_id' => $invoice->id], ['company_id' => $company->id, 'billing_period_id' => $period->id, 'status' => 'reserved']);
            }
        }, 3);
    }

    public function accept(Invoice $invoice): void
    {
        DB::transaction(function () use ($invoice) {
            $company = Company::whereKey($invoice->company_id)->lockForUpdate()->firstOrFail();
            $invoice = Invoice::whereKey($invoice->id)->lockForUpdate()->firstOrFail();
            if (in_array($invoice->document_type, ['01', '03'])) {
                $period = $this->subscriptions->current($company);
                $entry = QuotaEntry::where('invoice_id', $invoice->id)->first();
                if (! $entry || $entry->status !== 'consumed') {
                    QuotaEntry::updateOrCreate(['invoice_id' => $invoice->id], ['company_id' => $company->id, 'billing_period_id' => $period->id, 'status' => 'consumed', 'consumed_at' => now()]);
                }
            }
            $invoice->update(['status' => 'accepted', 'accepted_at' => $invoice->accepted_at ?? now()]);
        }, 3);
    }

    public function reject(Invoice $invoice): void
    {
        DB::transaction(function () use ($invoice) {
            Company::whereKey($invoice->company_id)->lockForUpdate()->firstOrFail();
            QuotaEntry::where('invoice_id', $invoice->id)->where('status', 'reserved')->update(['status' => 'released']);
            if (! $invoice->accepted_at) {
                $invoice->update(['status' => 'rejected']);
            }
        });
    }
}
