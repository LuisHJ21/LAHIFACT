<?php

namespace Tests\Feature;

use App\Jobs\ProcessSubmission;
use App\Models\BillingPeriod;
use App\Models\Company;
use App\Models\Customer;
use App\Models\DocumentSeries;
use App\Models\Establishment;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Submission;
use App\Models\Subscription;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\QuotaService;
use App\Services\SubscriptionService;
use App\Services\SunatService;
use App\Services\TaxCalculator;
use Carbon\Carbon;
use Greenter\Model\Response\BillResult;
use Greenter\Model\Response\CdrResponse;
use Greenter\Model\Response\Error;
use Greenter\Model\Response\StatusResult;
use Greenter\Model\Response\SummaryResult;
use Greenter\See;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;

    private User $owner;

    private Customer $customer;

    private Product $product;

    private DocumentSeries $series;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-01-31 12:00:00', 'America/Lima'));
        $this->company = Company::create(['ruc' => '20100070970', 'name' => 'Empresa & Asociados', 'ubigeo' => '150101', 'address' => 'Calle <Principal>', 'department' => 'LIMA', 'province' => 'LIMA', 'district' => 'LIMA']);
        $this->owner = User::factory()->create(['company_id' => $this->company->id, 'role' => 'owner']);
        $plan = Plan::create(['name' => 'Prueba', 'monthly_quota' => 2, 'annual_quota' => 15, 'user_limit' => 2, 'monthly_price' => 10, 'annual_price' => 100]);
        Subscription::create(['company_id' => $this->company->id, 'plan_id' => $plan->id, 'frequency' => 'monthly', 'starts_at' => '2026-01-31']);
        $period = app(SubscriptionService::class)->current($this->company);
        Payment::create(['company_id' => $this->company->id, 'billing_period_id' => $period->id, 'amount' => 10, 'paid_at' => '2026-01-31', 'reference' => 'Prueba', 'recorded_by' => $this->owner->id]);
        $this->customer = Customer::create(['company_id' => $this->company->id, 'document_type' => '6', 'document_number' => '20123456789', 'name' => 'Cliente & Socios']);
        $this->product = Product::create(['company_id' => $this->company->id, 'code' => 'P001', 'name' => 'Producto <especial>', 'price' => '118', 'kind' => 'product', 'unit_code' => 'NIU', 'tax_code' => '10', 'tax_rate' => 18]);
        $local = Establishment::create(['company_id' => $this->company->id, 'code' => '0000', 'name' => 'Principal', 'address' => 'Lima']);
        $this->series = DocumentSeries::create(['company_id' => $this->company->id, 'establishment_id' => $local->id, 'document_type' => '01', 'code' => 'F001']);
    }

    private function invoice(array $override = []): Invoice
    {
        return app(InvoiceService::class)->create($this->company, [...['document_series_id' => $this->series->id, 'customer_id' => $this->customer->id, 'issued_at' => today()->toDateString(), 'items' => [['product_id' => $this->product->id, 'quantity' => '1']]], ...$override]);
    }

    public function test_prices_discounts_and_mixed_taxes_are_calculated_with_decimals(): void
    {
        $calculated = app(TaxCalculator::class)->calculate([
            ['price' => '118', 'quantity' => '2', 'tax_code' => '10', 'discount_percent' => '10'],
            ['price' => '100', 'quantity' => '1', 'tax_code' => '20'],
        ], '5');
        $this->assertSame('296.78', $calculated['totals']['total']);
        $this->assertSame('171.00', $calculated['totals']['taxable']);
        $this->assertSame('95.00', $calculated['totals']['exonerated']);
        $this->assertSame('30.78', $calculated['totals']['tax']);
        $this->assertSame('39.22', $calculated['totals']['discount']);
    }

    public function test_quota_is_reserved_consumed_once_and_never_refunded(): void
    {
        $invoice = $this->invoice();
        $quota = app(QuotaService::class);
        $quota->reserve($this->company, [$invoice]);
        $this->assertDatabaseHas('quota_entries', ['invoice_id' => $invoice->id, 'status' => 'reserved']);
        $this->assertDatabaseCount('quota_entries', 1);
        $quota->accept($invoice);
        $quota->accept($invoice);
        $quota->reject($invoice->fresh());
        $this->assertDatabaseCount('quota_entries', 1);
        $this->assertDatabaseHas('quota_entries', ['invoice_id' => $invoice->id, 'status' => 'consumed']);
        $this->assertSame('accepted', $invoice->fresh()->status);
    }

    public function test_quota_blocks_new_sends_but_allows_registration_and_releases_rejected_reservations(): void
    {
        $quota = app(QuotaService::class);
        $a = $this->invoice();
        $b = $this->invoice();
        $c = $this->invoice();
        $quota->reserve($this->company, [$a, $b]);
        try {
            $quota->reserve($this->company, [$c]);
            $this->fail('El tercer envío debería superar el cupo.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('quota', $e->errors());
        }
        $quota->reject($a);
        $quota->reserve($this->company, [$c]);
        $this->assertDatabaseHas('quota_entries', ['invoice_id' => $c->id, 'status' => 'reserved']);
        $this->assertDatabaseCount('invoices', 3);
    }

    public function test_monthly_cycles_keep_contract_anchor_and_move_pending_reservations(): void
    {
        $invoice = $this->invoice();
        $quota = app(QuotaService::class);
        $quota->reserve($this->company, [$invoice]);
        $this->travelTo(Carbon::parse('2026-02-28 12:00:00'));
        $period = app(SubscriptionService::class)->current($this->company);
        $this->assertSame('2026-02-28', $period->starts_at->toDateString());
        $this->assertSame('2026-03-31', $period->ends_at->toDateString());
        $this->assertDatabaseHas('quota_entries', ['invoice_id' => $invoice->id, 'billing_period_id' => $period->id, 'status' => 'reserved']);
        $quota->accept($invoice);
        $this->assertDatabaseHas('quota_entries', ['invoice_id' => $invoice->id, 'billing_period_id' => $period->id, 'status' => 'consumed']);
    }

    public function test_annual_plan_has_one_bag_and_does_not_renew_monthly(): void
    {
        Subscription::where('company_id', $this->company->id)->update(['frequency' => 'annual']);
        Payment::query()->delete();
        BillingPeriod::query()->delete();
        $period = app(SubscriptionService::class)->current($this->company);
        $this->travelTo(Carbon::parse('2026-11-10'));
        $later = app(SubscriptionService::class)->current($this->company);
        $this->assertSame($period->id, $later->id);
        $this->assertSame(15, $later->quota);
        $this->assertSame('2027-01-31', $later->ends_at->toDateString());
    }

    public function test_unpaid_period_suspends_creation_the_day_after_due_date_but_keeps_read_access(): void
    {
        Payment::query()->delete();
        $this->assertFalse(app(SubscriptionService::class)->isSuspended($this->company));
        $this->travelTo(Carbon::parse('2026-02-01'));
        Sanctum::actingAs($this->owner);
        $this->getJson('/api/v1/invoices')->assertOk();
        $this->postJson('/api/v1/invoices', ['document_series_id' => $this->series->id, 'customer_id' => $this->customer->id, 'issued_at' => '2026-02-01', 'items' => [['product_id' => $this->product->id, 'quantity' => 1]]])->assertUnprocessable()->assertJsonValidationErrors('service');
    }

    public function test_company_header_cannot_bypass_tenant_isolation_or_admin_permissions(): void
    {
        $invoice = $this->invoice();
        $other = Company::create(['ruc' => '20999999999', 'name' => 'Otra empresa']);
        $user = User::factory()->create(['company_id' => $other->id, 'role' => 'operator']);
        Sanctum::actingAs($user);
        $this->withHeader('X-Company-Id', $this->company->id)->getJson('/api/v1/invoices/'.$invoice->id)->assertNotFound();
        $this->getJson('/api/v1/admin')->assertForbidden();
        $this->getJson('/api/v1/company')->assertForbidden();
        $this->assertSame([], $this->getJson('/api/v1/invoices')->json('data'));
    }

    public function test_administrator_can_read_company_history_but_cannot_write_operational_records(): void
    {
        $invoice = $this->invoice();
        $submission = Submission::create(['company_id' => $this->company->id, 'kind' => 'document', 'identifier' => 'DOC-admin', 'environment' => 'beta', 'reference_date' => today(), 'document_ids' => [$invoice->id], 'status' => 'queued']);
        $admin = User::factory()->create(['role' => 'admin', 'company_id' => null]);
        Sanctum::actingAs($admin);
        $this->withHeader('X-Company-Id', $this->company->id);
        $this->getJson('/api/v1/invoices')->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/v1/invoices/'.$invoice->id)->assertOk()->assertJsonPath('invoice.id', $invoice->id);
        $this->getJson('/api/v1/submissions')->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/v1/account')->assertOk();

        foreach (['/invoices', '/invoices/'.$invoice->id.'/deliver', '/submissions', '/submissions/'.$submission->id.'/retry', '/company', '/customers', '/products', '/warehouses', '/series', '/establishments'] as $path) {
            $this->postJson('/api/v1'.$path, [])->assertForbidden()->assertJsonPath('message', 'El administrador solo puede consultar los registros operativos de las empresas.');
        }
        $this->putJson('/api/v1/customers/'.$this->customer->id, ['name' => 'Cambio prohibido'])->assertForbidden();
        $this->putJson('/api/v1/products/'.$this->product->id, ['name' => 'Cambio prohibido'])->assertForbidden();
        $this->assertDatabaseCount('invoices', 1);
        $this->assertFalse($invoice->fresh()->delivered);
        $this->assertSame('queued', $submission->fresh()->status);
        $this->assertSame('Cliente & Socios', $this->customer->fresh()->name);

        $other = Company::create(['ruc' => '20999999999', 'name' => 'Otra empresa']);
        $this->withHeader('X-Company-Id', $other->id)->getJson('/api/v1/invoices/'.$invoice->id)->assertNotFound();
        $this->getJson('/api/v1/submissions')->assertJsonPath('total', 0);
    }

    public function test_administrator_can_still_manage_saas_plans_and_payments(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'company_id' => null]));
        $this->postJson('/api/v1/admin/plans', ['name' => 'Nuevo plan', 'monthly_quota' => 10, 'annual_quota' => 100, 'user_limit' => 5, 'monthly_price' => 20, 'annual_price' => 200])->assertCreated();
        $period = app(SubscriptionService::class)->current($this->company);
        $this->postJson('/api/v1/admin/payments', ['billing_period_id' => $period->id, 'amount' => 1, 'paid_at' => '2026-01-31', 'reference' => 'Pago administrativo'])->assertCreated();
        $this->getJson('/api/v1/admin')->assertOk();
        $this->assertDatabaseHas('plans', ['name' => 'Nuevo plan']);
        $this->assertDatabaseHas('payments', ['reference' => 'Pago administrativo']);
    }

    public function test_company_owner_can_still_create_operational_records(): void
    {
        Sanctum::actingAs($this->owner);
        $this->postJson('/api/v1/invoices', ['document_series_id' => $this->series->id, 'customer_id' => $this->customer->id, 'issued_at' => '2026-01-31', 'items' => [['product_id' => $this->product->id, 'quantity' => '1']]])->assertCreated();
        $this->postJson('/api/v1/warehouses', ['name' => 'Nuevo almacén', 'address' => 'Dirección del almacén'])->assertSuccessful();
        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseHas('warehouses', ['company_id' => $this->company->id, 'name' => 'Nuevo almacén']);
    }

    public function test_notes_do_not_consume_quota_and_correlatives_are_independent(): void
    {
        $invoice = $this->invoice();
        app(QuotaService::class)->accept($invoice);
        $series = DocumentSeries::create(['company_id' => $this->company->id, 'establishment_id' => $this->series->establishment_id, 'document_type' => '07', 'code' => 'FC01']);
        $note = $this->invoice(['document_series_id' => $series->id, 'reference_id' => $invoice->id, 'reason_code' => '01', 'reason' => 'Anulación de la operación']);
        app(QuotaService::class)->reserve($this->company, [$note]);
        app(QuotaService::class)->accept($note);
        $this->assertDatabaseCount('quota_entries', 1);
        $this->assertSame(1, $note->number);
        $this->assertSame(2, $this->invoice()->number);
    }

    public function test_xml_is_signed_and_preserves_escaped_names_and_cash_payment(): void
    {
        $invoice = $this->invoice();
        $key = openssl_pkey_new(['private_key_bits' => 2048]);
        $csr = openssl_csr_new(['commonName' => 'LAHIFACT test'], $key);
        $certificate = openssl_csr_sign($csr, null, $key, 1);
        openssl_pkcs12_export($certificate, $pfx, $key, 'test-password');
        $this->company->update(['sol_user' => 'MODDATOS', 'sol_password' => 'moddatos', 'certificate' => base64_encode($pfx), 'certificate_password' => 'test-password']);
        $service = app(SunatService::class);
        $xml = $service->client($this->company, 'beta')->getXmlSigned($service->document($invoice));
        $doc = new \DOMDocument;
        $this->assertTrue($doc->loadXML($xml));
        $xpath = new \DOMXPath($doc);
        $xpath->registerNamespace('cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2');
        $xpath->registerNamespace('ds', 'http://www.w3.org/2000/09/xmldsig#');
        $this->assertSame('Contado', $xpath->query('//cbc:PaymentMeansID')->item(0)->textContent);
        $this->assertSame('Producto <especial>', $xpath->query('//cbc:Description')->item(0)->textContent);
        $this->assertSame(1, $xpath->query('//ds:Signature')->length);
        $this->assertStringNotContainsString('test-password', $xml);
    }

    public function test_uncertain_result_keeps_reservation_and_consults_instead_of_resending(): void
    {
        Storage::fake('local');
        $invoice = $this->invoice();
        app(QuotaService::class)->reserve($this->company, [$invoice]);
        $submission = Submission::create(['company_id' => $this->company->id, 'kind' => 'document', 'identifier' => 'DOC-test', 'environment' => 'beta', 'reference_date' => today(), 'document_ids' => [$invoice->id], 'status' => 'uncertain']);
        $mock = $this->mock(SunatService::class);
        $mock->shouldReceive('consult')->once()->andReturnNull();
        $mock->shouldNotReceive('send');
        app()->call([new ProcessSubmission($submission->id), 'handle']);
        $this->assertSame('uncertain', $submission->fresh()->status);
        $this->assertDatabaseHas('quota_entries', ['invoice_id' => $invoice->id, 'status' => 'reserved']);
    }

    public function test_an_accepted_cdr_consumes_once_even_with_duplicate_jobs(): void
    {
        Storage::fake('local');
        $invoice = $this->invoice();
        app(QuotaService::class)->reserve($this->company, [$invoice]);
        $submission = Submission::create(['company_id' => $this->company->id, 'kind' => 'document', 'identifier' => 'DOC-accepted', 'environment' => 'beta', 'reference_date' => today(), 'document_ids' => [$invoice->id]]);
        $result = (new BillResult)->setSuccess(true)->setCdrZip('CDR fixture')
            ->setCdrResponse((new CdrResponse)->setCode('0')->setDescription('Aceptado')->setNotes(['Observación informativa']));
        $mock = $this->mock(SunatService::class);
        $mock->shouldReceive('client')->once()->andReturn(new See);
        $mock->shouldReceive('send')->once()->andReturn($result);
        app()->call([new ProcessSubmission($submission->id), 'handle']);
        app()->call([new ProcessSubmission($submission->id), 'handle']);
        $this->assertSame('accepted', $submission->fresh()->status);
        $this->assertSame('accepted', $invoice->fresh()->status);
        $this->assertDatabaseCount('quota_entries', 1);
        $this->assertDatabaseHas('quota_entries', ['status' => 'consumed']);
        Storage::disk('local')->assertExists($submission->fresh()->cdr_path);
    }

    public function test_summary_ticket_is_not_consumption_and_cdr_rejection_releases_reservations(): void
    {
        Storage::fake('local');
        $invoice = $this->invoice();
        app(QuotaService::class)->reserve($this->company, [$invoice]);
        $submission = Submission::create(['company_id' => $this->company->id, 'kind' => 'summary', 'identifier' => 'RC-ticket', 'environment' => 'beta', 'reference_date' => today(), 'document_ids' => [$invoice->id]]);
        $ticket = (new SummaryResult)->setSuccess(true)->setTicket('123456789');
        $rejection = (new StatusResult)->setSuccess(true)->setCdrZip('CDR rejected fixture')
            ->setCdrResponse((new CdrResponse)->setCode('2020')->setDescription('Rechazado'));
        $mock = $this->mock(SunatService::class);
        $mock->shouldReceive('client')->once()->andReturn(new See);
        $mock->shouldReceive('send')->once()->andReturn($ticket);
        $mock->shouldReceive('consult')->once()->andReturn($rejection);
        app()->call([new ProcessSubmission($submission->id), 'handle']);
        $this->assertSame('pending', $submission->fresh()->status);
        $this->assertSame('pending', $invoice->fresh()->status);
        $this->assertDatabaseHas('quota_entries', ['status' => 'reserved']);
        app()->call([new ProcessSubmission($submission->id), 'handle']);
        $this->assertSame('rejected', $submission->fresh()->status);
        $this->assertDatabaseHas('quota_entries', ['status' => 'released']);
    }

    public function test_duplicate_document_fault_does_not_release_a_reservation(): void
    {
        $invoice = $this->invoice();
        app(QuotaService::class)->reserve($this->company, [$invoice]);
        $submission = Submission::create(['company_id' => $this->company->id, 'kind' => 'document', 'identifier' => 'DOC-duplicate', 'environment' => 'beta', 'reference_date' => today(), 'document_ids' => [$invoice->id]]);
        $result = (new BillResult)->setSuccess(false)->setError(new Error('2109', 'Registrado previamente'));
        $mock = $this->mock(SunatService::class);
        $mock->shouldReceive('client')->once()->andReturn(new See);
        $mock->shouldReceive('send')->once()->andReturn($result);
        app()->call([new ProcessSubmission($submission->id), 'handle']);
        $this->assertSame('uncertain', $submission->fresh()->status);
        $this->assertDatabaseHas('quota_entries', ['status' => 'reserved']);
    }

    public function test_void_acceptance_keeps_the_consumed_quota(): void
    {
        Storage::fake('local');
        $invoice = $this->invoice();
        app(QuotaService::class)->accept($invoice);
        $submission = Submission::create(['company_id' => $this->company->id, 'kind' => 'voided', 'identifier' => 'RA-void', 'environment' => 'beta', 'reference_date' => today(), 'document_ids' => [$invoice->id], 'operations' => [(string) $invoice->id => ['code' => '3', 'reason' => 'No entregado']]]);
        $result = (new BillResult)->setSuccess(true)->setCdrZip('CDR void fixture')
            ->setCdrResponse((new CdrResponse)->setCode('0')->setDescription('Baja aceptada'));
        $mock = $this->mock(SunatService::class);
        $mock->shouldReceive('client')->once()->andReturn(new See);
        $mock->shouldReceive('send')->once()->andReturn($result);
        app()->call([new ProcessSubmission($submission->id), 'handle']);
        $this->assertSame('voided', $invoice->fresh()->status);
        $this->assertDatabaseHas('quota_entries', ['invoice_id' => $invoice->id, 'status' => 'consumed']);
    }

    public function test_summary_and_void_xml_use_distinct_dates_and_preserve_references(): void
    {
        $invoice = $this->invoice();
        $summary = Submission::create(['company_id' => $this->company->id, 'kind' => 'summary', 'identifier' => 'RC-20260131-1', 'environment' => 'beta', 'reference_date' => '2026-01-30', 'document_ids' => [$invoice->id], 'operations' => [(string) $invoice->id => ['code' => '1']]]);
        $model = app(SunatService::class)->batch($summary);
        $this->assertSame('RC-20260131-1', $model->getXmlId());
        $this->assertSame('2026-01-30', $model->getFecGeneracion()->format('Y-m-d'));
        $void = Submission::create(['company_id' => $this->company->id, 'kind' => 'voided', 'identifier' => 'RA-20260131-2', 'environment' => 'beta', 'reference_date' => '2026-01-30', 'document_ids' => [$invoice->id], 'operations' => [(string) $invoice->id => ['code' => '3', 'reason' => 'No entregado']]]);
        $voidModel = app(SunatService::class)->batch($void);
        $this->assertSame('RA-20260131-2', $voidModel->getXmlId());
        $this->assertSame('2026-01-30', $voidModel->getFecGeneracion()->format('Y-m-d'));
    }

    public function test_changing_a_plan_does_not_change_a_current_period_snapshot(): void
    {
        $period = app(SubscriptionService::class)->current($this->company);
        $plan = Subscription::where('company_id', $this->company->id)->first()->plan;
        $plan->update(['monthly_quota' => 99, 'monthly_price' => 199]);
        $this->assertSame(2, app(SubscriptionService::class)->current($this->company)->quota);
        $this->travelTo(Carbon::parse('2026-02-28'));
        $this->assertSame(99, app(SubscriptionService::class)->current($this->company)->quota);
        $this->assertSame('10.00', (string) $period->fresh()->price);
    }
}
