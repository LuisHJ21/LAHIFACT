<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompanyController extends Controller
{
    public function show(Request $request): mixed
    {
        $company = $request->attributes->get('company');
        abort_if($request->user()->role === 'operator', 403);

        return [...$company->toArray(), 'has_credentials' => (bool) ($company->sol_user && $company->sol_password), 'has_certificate' => (bool) $company->certificate];
    }

    public function save(Request $request): mixed
    {
        abort_if($request->user()->role === 'operator', 403);
        $company = $request->attributes->get('company');
        $data = $request->validate(['name' => 'required|string|max:255', 'address' => 'required|string|max:255', 'ubigeo' => 'required|digits:6',
            'department' => 'required|string|max:100', 'province' => 'required|string|max:100', 'district' => 'required|string|max:100',
            'environment' => 'required|in:beta,production', 'sol_user' => 'nullable|string|max:100', 'sol_password' => 'nullable|string|max:100',
            'certificate' => 'nullable|file|max:1024', 'certificate_password' => 'nullable|string|max:255']);
        foreach (['sol_user', 'sol_password', 'certificate_password'] as $field) {
            if (empty($data[$field])) {
                unset($data[$field]);
            }
        }
        unset($data['certificate']);
        if ($request->hasFile('certificate')) {
            $certs = [];
            $bytes = $request->file('certificate')->get();
            $password = $data['certificate_password'] ?? $company->certificate_password ?? '';
            if (! openssl_pkcs12_read($bytes, $certs, $password)) {
                throw ValidationException::withMessages(['certificate' => 'Certificado PFX/P12 o contraseña incorrectos.']);
            }
            $parsed = openssl_x509_parse($certs['cert']);
            if (! $parsed || $parsed['validTo_time_t'] < time()) {
                throw ValidationException::withMessages(['certificate' => 'El certificado está vencido.']);
            }
            $data['certificate'] = base64_encode($bytes);
            $data['certificate_password'] = $password;
        }

        return DB::transaction(function () use ($company, $data) {
            Company::whereKey($company->id)->lockForUpdate()->firstOrFail();
            app(SubscriptionService::class)->assertWritable($company);
            $company->update($data);

            return $company;
        });
    }

    public function account(Request $request, SubscriptionService $subscriptions): mixed
    {
        abort_if($request->user()->role === 'operator', 403);

        return $subscriptions->account($request->attributes->get('company'));
    }
}
