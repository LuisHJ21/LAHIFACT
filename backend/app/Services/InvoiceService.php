<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Customer;
use App\Models\DocumentSeries;
use App\Models\Establishment;
use App\Models\Invoice;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceService
{
    /**
     * Create a new class instance.
     */
    public function __construct(private TaxCalculator $taxes, private SubscriptionService $subscriptions) {}

    public function create(Company $company, array $data): Invoice
    {
        return DB::transaction(function () use ($company, $data) {
            $company = Company::whereKey($company->id)->lockForUpdate()->firstOrFail();
            $this->subscriptions->assertWritable($company);
            foreach (['name', 'address', 'ubigeo', 'department', 'province', 'district'] as $field) {
                if (trim((string) $company->{$field}) === '') {
                    throw ValidationException::withMessages(['company' => 'Completa los datos fiscales de la empresa antes de emitir comprobantes.']);
                }
            }
            $series = DocumentSeries::where('company_id', $company->id)->whereKey($data['document_series_id'])->lockForUpdate()->firstOrFail();
            $customer = Customer::where('company_id', $company->id)->findOrFail($data['customer_id']);
            if ($series->document_type === '01' && $customer->document_type !== '6') {
                throw ValidationException::withMessages(['customer_id' => 'La factura de venta interna requiere cliente con RUC.']);
            }
            if ($series->next_number > 99999999) {
                throw ValidationException::withMessages(['series' => 'La serie agotó sus correlativos.']);
            }
            $reference = null;
            if (in_array($series->document_type, ['07', '08'])) {
                $reference = Invoice::where('company_id', $company->id)->where('status', 'accepted')->findOrFail($data['reference_id'] ?? 0);
                if (! in_array($reference->document_type, ['01', '03']) || $reference->customer_id !== $customer->id || $reference->environment !== $company->environment || $series->code[0] !== $reference->series[0]) {
                    throw ValidationException::withMessages(['reference_id' => 'La nota debe referenciar una factura o boleta aceptada del mismo cliente, ambiente y prefijo de serie.']);
                }
            }
            $lines = [];
            foreach ($data['items'] as $item) {
                $product = Product::where('company_id', $company->id)->findOrFail($item['product_id']);
                $original = $reference ? collect($reference->items)->firstWhere('product_id', $product->id) : null;
                if ($reference && ! $original) {
                    throw ValidationException::withMessages(['items' => 'Los productos de la nota deben pertenecer al comprobante original.']);
                }
                $lines[] = ['product_id' => $product->id, 'code' => $original['code'] ?? $product->code, 'name' => $original['name'] ?? $product->name,
                    'unit_code' => $original['unit_code'] ?? $product->unit_code, 'tax_code' => $original['tax_code'] ?? $product->tax_code, 'tax_rate' => $original['tax_rate'] ?? $product->tax_rate,
                    'price' => $item['price'] ?? $product->price, 'quantity' => $item['quantity'], 'discount_percent' => $item['discount_percent'] ?? 0];
            }
            $calculated = $this->taxes->calculate($lines, (string) ($data['global_discount_percent'] ?? 0));
            if (bccomp($calculated['totals']['total'], '0', 2) <= 0) {
                throw ValidationException::withMessages(['items' => 'El total debe ser mayor que cero. Las operaciones gratuitas requieren un flujo específico.']);
            }
            if ($reference && $series->document_type === '07') {
                $credited = '0.00';
                foreach (Invoice::where('reference_id', $reference->id)->where('document_type', '07')->whereNotIn('status', ['rejected', 'voided'])->get() as $note) {
                    $credited = bcadd($credited, $note->totals['total'], 2);
                }
                if (bccomp(bcadd($credited, $calculated['totals']['total'], 2), $reference->totals['total'], 2) > 0) {
                    throw ValidationException::withMessages(['items' => 'Las notas de crédito no pueden superar el total del comprobante de referencia.']);
                }
                if (in_array($data['reason_code'], ['01', '06']) && bccomp($calculated['totals']['total'], $reference->totals['total'], 2) !== 0) {
                    throw ValidationException::withMessages(['items' => 'La anulación o devolución total requiere el importe completo del comprobante original.']);
                }
            }
            $establishment = Establishment::findOrFail($series->establishment_id);
            $invoice = Invoice::create([
                'company_id' => $company->id, 'customer_id' => $customer->id, 'document_series_id' => $series->id,
                'document_type' => $series->document_type, 'series' => $series->code, 'number' => $series->next_number,
                'issued_at' => $data['issued_at'], 'environment' => $company->environment,
                'customer_snapshot' => $customer->only(['document_type', 'document_number', 'name', 'address']),
                'company_snapshot' => [...$company->only(['ruc', 'name', 'address', 'ubigeo', 'department', 'province', 'district']), 'establishment_code' => $establishment->code],
                ...$calculated, 'reference_id' => $reference?->id, 'reason_code' => $data['reason_code'] ?? null, 'reason' => $data['reason'] ?? null,
            ]);
            $series->increment('next_number');

            return $invoice->refresh();
        }, 3);
    }
}
