<?php

namespace App\Http\Controllers;

use App\Models\BillingPeriod;
use App\Models\Company;
use App\Models\DocumentSeries;
use App\Models\Establishment;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()->role === 'admin', 403);
    }

    public function index(Request $request): mixed
    {
        $this->authorizeAdmin($request);

        return ['companies' => Company::orderBy('name')->get(), 'plans' => Plan::all(), 'users' => User::all(),
            'subscriptions' => Subscription::with('plan')->get(), 'periods' => BillingPeriod::latest('starts_at')->get(), 'payments' => Payment::latest()->get()];
    }

    public function company(Request $request, SubscriptionService $service): mixed
    {
        $this->authorizeAdmin($request);
        $data = $request->validate(['ruc' => 'required|digits:11|unique:companies', 'name' => 'required|string|max:255', 'plan_id' => 'required|exists:plans,id',
            'frequency' => 'required|in:monthly,annual', 'starts_at' => 'required|date_format:Y-m-d|before_or_equal:today', 'owner_name' => 'required|string|max:255', 'email' => 'required|email|unique:users', 'password' => 'required|string|min:12']);

        return DB::transaction(function () use ($data, $service) {
            $company = Company::create(['ruc' => $data['ruc'], 'name' => $data['name']]);
            Subscription::create(['company_id' => $company->id, 'plan_id' => $data['plan_id'], 'frequency' => $data['frequency'], 'starts_at' => $data['starts_at']]);
            User::create(['company_id' => $company->id, 'role' => 'owner', 'name' => $data['owner_name'], 'email' => $data['email'], 'password' => $data['password']]);
            $establishment = Establishment::create(['company_id' => $company->id, 'code' => '0000', 'name' => 'Domicilio fiscal', 'address' => 'Por configurar']);
            foreach (['01' => 'F001', '03' => 'B001', '07' => 'FC01', '08' => 'FD01'] as $type => $code) {
                DocumentSeries::create(['company_id' => $company->id, 'establishment_id' => $establishment->id, 'document_type' => $type, 'code' => $code]);
            }
            foreach (['07' => 'BC01', '08' => 'BD01'] as $type => $code) {
                DocumentSeries::create(['company_id' => $company->id, 'establishment_id' => $establishment->id, 'document_type' => $type, 'code' => $code]);
            }
            $service->current($company);

            return $company;
        });
    }

    public function plan(Request $request, ?int $id = null): mixed
    {
        $this->authorizeAdmin($request);
        $data = $request->validate(['name' => 'required|string|max:100', 'monthly_quota' => 'required|integer|min:1', 'annual_quota' => 'required|integer|min:1',
            'user_limit' => 'required|integer|min:1', 'monthly_price' => 'required|numeric|min:0|decimal:0,2', 'annual_price' => 'required|numeric|min:0|decimal:0,2']);
        $plan = $id ? Plan::findOrFail($id) : new Plan;
        $plan->fill($data)->save();

        return $plan;
    }

    public function payment(Request $request): mixed
    {
        $this->authorizeAdmin($request);
        $data = $request->validate(['billing_period_id' => 'required|exists:billing_periods,id', 'amount' => 'required|numeric|min:0.01|decimal:0,2',
            'paid_at' => 'required|date_format:Y-m-d|before_or_equal:today', 'reference' => 'required|string|max:255']);
        $period = BillingPeriod::findOrFail($data['billing_period_id']);

        return Payment::create([...$data, 'company_id' => $period->company_id, 'recorded_by' => $request->user()->id]);
    }

    public function user(Request $request, SubscriptionService $service): mixed
    {
        $this->authorizeAdmin($request);
        $data = $request->validate(['company_id' => 'required|exists:companies,id', 'name' => 'required|string|max:255', 'email' => 'required|email|unique:users',
            'password' => 'required|min:12', 'role' => 'required|in:owner,operator']);

        return DB::transaction(function () use ($data, $service) {
            $company = Company::whereKey($data['company_id'])->lockForUpdate()->firstOrFail();
            $period = $service->current($company);
            if (User::where('company_id', $company->id)->count() >= $period->user_limit) {
                throw ValidationException::withMessages(['users' => 'Se alcanzó el límite de usuarios del plan.']);
            }

            return User::create($data);
        });
    }

    public function status(Request $request, int $id): mixed
    {
        $this->authorizeAdmin($request);
        $data = $request->validate(['status' => 'required|in:active,suspended']);
        $company = Company::findOrFail($id);
        $company->update($data);

        return $company;
    }

    public function updateUser(Request $request, int $id): mixed
    {
        $this->authorizeAdmin($request);
        $user = User::whereIn('role', ['owner', 'operator'])->findOrFail($id);
        $data = $request->validate(['name' => 'required|string|max:255', 'email' => ['required', 'email', Rule::unique('users')->ignore($id)], 'role' => 'required|in:owner,operator', 'password' => 'nullable|string|min:12']);
        if (empty($data['password'])) {
            unset($data['password']);
        }
        $user->update($data);
        $user->tokens()->delete();

        return $user;
    }

    public function changePlan(Request $request, int $id): mixed
    {
        $this->authorizeAdmin($request);
        $data = $request->validate(['plan_id' => 'required|exists:plans,id']);

        return DB::transaction(function () use ($id, $data) {
            $company = Company::whereKey($id)->lockForUpdate()->firstOrFail();
            app(SubscriptionService::class)->current($company);
            $subscription = Subscription::where('company_id', $id)->firstOrFail();
            $subscription->update($data);

            return ['message' => 'Plan actualizado para futuros periodos. El periodo actual conserva sus condiciones.', 'subscription' => $subscription];
        });
    }
}
