<?php

namespace App\Services;

use App\Models\BillingPeriod;
use App\Models\Company;
use App\Models\Payment;
use App\Models\QuotaEntry;
use App\Models\Subscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionService
{
    public function current(Company $company): BillingPeriod
    {
        return DB::transaction(function () use ($company) {
            Company::whereKey($company->id)->lockForUpdate()->firstOrFail();
            $subscription = Subscription::with('plan')->where('company_id', $company->id)->first();
            if (! $subscription || $subscription->starts_at->isFuture()) {
                throw ValidationException::withMessages(['plan' => 'La empresa no tiene una contratación vigente.']);
            }
            $annual = $subscription->frequency === 'annual';
            $anchor = $subscription->starts_at;
            $index = 0;
            do {
                $start = $annual ? $anchor->addYearsNoOverflow($index) : $anchor->addMonthsNoOverflow($index);
                $end = ($annual ? $anchor->addYearsNoOverflow($index + 1) : $anchor->addMonthsNoOverflow($index + 1));
                $period = BillingPeriod::where('company_id', $company->id)->whereDate('starts_at', $start->toDateString())->first();
                $period ??= BillingPeriod::create([
                    'company_id' => $company->id, 'starts_at' => $start->toDateString(),
                    'ends_at' => $end->toDateString(), 'due_at' => $start->toDateString(),
                    'quota' => $annual ? $subscription->plan->annual_quota : $subscription->plan->monthly_quota,
                    'user_limit' => $subscription->plan->user_limit,
                    'price' => $annual ? $subscription->plan->annual_price : $subscription->plan->monthly_price,
                ]);
                $index++;
            } while ($end->startOfDay()->lte(now()));
            QuotaEntry::where('company_id', $company->id)->where('status', 'reserved')->update(['billing_period_id' => $period->id]);

            return $period;
        }, 3);
    }

    public function isSuspended(Company $company): bool
    {
        $this->current($company);
        if ($company->status === 'suspended') {
            return true;
        }
        foreach (BillingPeriod::where('company_id', $company->id)->whereDate('due_at', '<', today())->get() as $period) {
            $paid = Payment::where('billing_period_id', $period->id)->sum('amount');
            if (bccomp((string) $paid, (string) $period->price, 2) < 0) {
                return true;
            }
        }

        return false;
    }

    public function assertWritable(Company $company): void
    {
        if ($this->isSuspended($company)) {
            throw ValidationException::withMessages(['service' => 'Servicio suspendido. Puedes consultar y descargar tu historial.']);
        }
    }

    public function account(Company $company): array
    {
        $period = $this->current($company);
        $consumed = QuotaEntry::where('billing_period_id', $period->id)->where('status', 'consumed')->count();
        $reserved = QuotaEntry::where('billing_period_id', $period->id)->where('status', 'reserved')->count();

        return [
            'period' => $period, 'consumed' => $consumed, 'reserved' => $reserved,
            'available' => max(0, $period->quota - $consumed - $reserved),
            'status' => $this->isSuspended($company) ? 'suspended' : 'active',
            'subscription' => Subscription::with('plan')->where('company_id', $company->id)->first(),
            'periods' => BillingPeriod::where('company_id', $company->id)->latest('starts_at')->get(),
            'payments' => Payment::where('company_id', $company->id)->latest('paid_at')->get(),
        ];
    }
}
