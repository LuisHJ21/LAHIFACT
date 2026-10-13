<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Customer;
use App\Models\DocumentSeries;
use App\Models\Establishment;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            return;
        }
        $admin = User::firstOrCreate(['email' => 'admin@lahifact.local'], ['name' => 'Administrador LAHIFACT', 'role' => 'admin', 'password' => 'LahifactLocal2026!']);
        $plan = Plan::firstOrCreate(['name' => 'Emprendedor'], ['monthly_quota' => 100, 'annual_quota' => 1200, 'user_limit' => 3, 'monthly_price' => '39.00', 'annual_price' => '390.00']);
        $company = Company::firstOrCreate(['ruc' => '20123456789'], ['name' => 'Empresa de demostración', 'address' => 'Av. Principal 123', 'ubigeo' => '150101', 'department' => 'LIMA', 'province' => 'LIMA', 'district' => 'LIMA']);
        User::firstOrCreate(['email' => 'empresa@lahifact.local'], ['name' => 'Responsable demo', 'company_id' => $company->id, 'role' => 'owner', 'password' => 'LahifactLocal2026!']);
        Subscription::firstOrCreate(['company_id' => $company->id], ['plan_id' => $plan->id, 'frequency' => 'monthly', 'starts_at' => today()->toDateString()]);
        $period = app(SubscriptionService::class)->current($company);
        Payment::firstOrCreate(['billing_period_id' => $period->id], ['company_id' => $company->id, 'amount' => $period->price, 'paid_at' => today(), 'reference' => 'Pago local de demostración', 'recorded_by' => $admin->id]);
        $local = Establishment::firstOrCreate(['company_id' => $company->id, 'code' => '0000'], ['name' => 'Domicilio fiscal', 'address' => $company->address]);
        foreach ([['01', 'F001'], ['03', 'B001'], ['07', 'FC01'], ['08', 'FD01'], ['07', 'BC01'], ['08', 'BD01']] as [$type, $code]) {
            DocumentSeries::firstOrCreate(['company_id' => $company->id, 'document_type' => $type, 'code' => $code], ['establishment_id' => $local->id]);
        }
        Customer::firstOrCreate(['company_id' => $company->id, 'document_type' => '6', 'document_number' => '20100070970'], ['name' => 'Cliente de ejemplo', 'address' => 'Lima, Perú']);
        foreach ([['P001', 'Producto de ejemplo', 'product', 'NIU', '118.00'], ['S001', 'Servicio de ejemplo', 'service', 'ZZ', '59.00']] as [$code, $name, $kind, $unit, $price]) {
            Product::firstOrCreate(['company_id' => $company->id, 'code' => $code], ['name' => $name, 'kind' => $kind, 'unit_code' => $unit, 'price' => $price, 'tax_code' => '10', 'tax_rate' => '18.00']);
        }
    }
}
