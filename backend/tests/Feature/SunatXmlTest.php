<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Customer;
use App\Models\DocumentSeries;
use App\Models\Invoice;
use App\Models\Submission;
use App\Services\SunatService;
use App\Services\TaxCalculator;
use Greenter\XMLSecLibs\Sunat\SignedXml;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SunatXmlTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->company = Company::firstOrFail();
        $key = openssl_pkey_new(['private_key_bits' => 2048]);
        $csr = openssl_csr_new(['commonName' => 'LAHIFACT XML test'], $key);
        $certificate = openssl_csr_sign($csr, null, $key, 1);
        openssl_pkcs12_export($certificate, $pfx, $key, 'test-password');
        $this->company->update(['name' => 'Empresa ]]> & socios', 'sol_user' => 'MODDATOS', 'sol_password' => 'moddatos', 'certificate' => base64_encode($pfx), 'certificate_password' => 'test-password']);
    }

    public static function documentTypes(): array
    {
        return [['01', 'Invoice', 'F001'], ['03', 'Invoice', 'B001'], ['07', 'CreditNote', 'FC01'], ['08', 'DebitNote', 'FD01']];
    }

    private function invoice(string $type, string $series): Invoice
    {
        $referenceId = null;
        if (in_array($type, ['07', '08'])) {
            $referenceId = $this->invoice('01', 'F001')->id;
        }
        $totals = app(TaxCalculator::class)->calculate([
            ['product_id' => 1, 'code' => 'P001', 'name' => 'Producto ]]> <especial> & socios', 'quantity' => '2', 'price' => '118', 'unit_code' => 'NIU', 'tax_code' => '10', 'discount_percent' => '10'],
        ], '5');

        return Invoice::create([
            'company_id' => $this->company->id, 'customer_id' => Customer::firstOrFail()->id,
            'document_series_id' => DocumentSeries::where('document_type', $type)->where('code', $series)->firstOrFail()->id,
            'document_type' => $type, 'series' => $series, 'number' => 1, 'issued_at' => today(), 'status' => 'accepted',
            'customer_snapshot' => ['document_type' => '6', 'document_number' => '20100070970', 'name' => 'Cliente & socios', 'address' => 'Lima'],
            'company_snapshot' => [...$this->company->only(['ruc', 'name', 'address', 'ubigeo', 'department', 'province', 'district']), 'establishment_code' => '0000'],
            'reference_id' => $referenceId, 'reason_code' => '01', 'reason' => 'Motivo & explicación', ...$totals,
        ])->refresh();
    }

    #[DataProvider('documentTypes')]
    public function test_each_document_has_the_expected_ubl_root_and_a_verifiable_signature(string $type, string $root, string $series): void
    {
        $invoice = $this->invoice($type, $series);
        $service = app(SunatService::class);
        $xml = $service->client($this->company, 'beta')->getXmlSigned($service->document($invoice));
        $document = new \DOMDocument;
        $this->assertTrue($document->loadXML($xml));
        $this->assertSame($root, $document->documentElement->localName);
        $this->assertTrue((new SignedXml)->verifyXml($xml));
        $xpath = new \DOMXPath($document);
        $xpath->registerNamespace('cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2');
        $this->assertSame('2.1', $xpath->query('//cbc:UBLVersionID')->item(0)->textContent);
        $this->assertSame('Producto ]]> <especial> & socios', $xpath->query('//*[local-name()="Item"]/cbc:Description')->item(0)->textContent);
        if ($type === '07' || $type === '08') {
            $this->assertSame('F001-1', $xpath->query('//*[local-name()="InvoiceDocumentReference"]/cbc:ID')->item(0)->textContent);
        }
        $this->assertFalse((new SignedXml)->verifyXml(str_replace('20100070970', '20100070971', $xml)));
    }

    public static function batchTypes(): array
    {
        return [['summary', 'SummaryDocuments', 'RC', '1'], ['summary', 'SummaryDocuments', 'RC', '3'], ['voided', 'VoidedDocuments', 'RA', '3']];
    }

    #[DataProvider('batchTypes')]
    public function test_summary_and_void_documents_are_signed_and_include_the_operation(string $kind, string $root, string $prefix, string $operation): void
    {
        $invoice = $this->invoice($kind === 'summary' ? '03' : '01', $kind === 'summary' ? 'B001' : 'F001');
        $invoice->update(['issued_at' => today()->subDay()]);
        $submission = Submission::create([
            'company_id' => $this->company->id, 'kind' => $kind, 'identifier' => $prefix.'-'.today()->format('Ymd').'-1',
            'environment' => 'beta', 'reference_date' => today()->subDay(), 'document_ids' => [$invoice->id],
            'operations' => [(string) $invoice->id => ['code' => $operation, 'reason' => 'No entregado ]]> al cliente']],
        ]);
        $service = app(SunatService::class);
        $xml = $service->client($this->company, 'beta')->getXmlSigned($service->batch($submission));
        $document = new \DOMDocument;
        $this->assertTrue($document->loadXML($xml));
        $this->assertSame($root, $document->documentElement->localName);
        $this->assertTrue((new SignedXml)->verifyXml($xml));
        $xpath = new \DOMXPath($document);
        $xpath->registerNamespace('cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2');
        $this->assertSame('2.0', $xpath->query('//cbc:UBLVersionID')->item(0)->textContent);
        $this->assertSame(today()->subDay()->toDateString(), $xpath->query('//cbc:ReferenceDate')->item(0)->textContent);
        $this->assertSame(today()->toDateString(), $xpath->query('//cbc:IssueDate')->item(0)->textContent);
        if ($kind === 'summary') {
            $this->assertSame($operation, $xpath->query('//cbc:ConditionCode')->item(0)->textContent);
        } else {
            $this->assertSame('No entregado ]]> al cliente', $xpath->query('//*[local-name()="VoidReasonDescription"]')->item(0)->textContent);
        }
    }
}
