<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Invoice;
use App\Models\Submission;
use Greenter\Factory\WsSenderResolver;
use Greenter\Model\Client\Client;
use Greenter\Model\Company\Address;
use Greenter\Model\Company\Company as SunatCompany;
use Greenter\Model\DocumentInterface;
use Greenter\Model\Sale\Charge;
use Greenter\Model\Sale\Document;
use Greenter\Model\Sale\FormaPagos\FormaPagoContado;
use Greenter\Model\Sale\Invoice as SunatInvoice;
use Greenter\Model\Sale\Legend;
use Greenter\Model\Sale\Note;
use Greenter\Model\Sale\SaleDetail;
use Greenter\Model\Summary\Summary;
use Greenter\Model\Summary\SummaryDetail;
use Greenter\Model\Voided\Voided;
use Greenter\Model\Voided\VoidedDetail;
use Greenter\See;
use Greenter\Ws\Services\ConsultCdrService;
use Greenter\Ws\Services\ExtService;
use Greenter\Ws\Services\SoapClient;
use Greenter\Ws\Services\WsdlProvider;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SunatService
{
    /**
     * Create a new class instance.
     */
    public function client(Company $company, string $environment): See
    {
        if (! $company->certificate || ! $company->sol_user || ! $company->sol_password) {
            throw ValidationException::withMessages(['sunat' => 'Configura el certificado digital y las credenciales SOL antes de enviar.']);
        }
        $certificates = [];
        if (! openssl_pkcs12_read(base64_decode($company->certificate), $certificates, $company->certificate_password ?? '')) {
            throw ValidationException::withMessages(['certificate' => 'No se pudo abrir el certificado PFX/P12.']);
        }
        $certificate = openssl_x509_parse($certificates['cert']);
        if (! $certificate || $certificate['validTo_time_t'] < time() || $certificate['validFrom_time_t'] > time()) {
            throw ValidationException::withMessages(['certificate' => 'El certificado no está vigente.']);
        }
        $see = new See;
        $see->setBuilderOptions(['autoescape' => 'html']);
        $see->setCertificate($certificates['pkey'].$certificates['cert']);
        $see->setService(config('sunat.'.$environment));
        $see->setClaveSOL($company->ruc, $company->sol_user, $company->sol_password);

        return $see;
    }

    public function issuer(array $snapshot): SunatCompany
    {
        $address = (new Address)->setUbigueo($snapshot['ubigeo'])->setDepartamento($snapshot['department'])
            ->setProvincia($snapshot['province'])->setDistrito($snapshot['district'])->setDireccion($this->cdata($snapshot['address']))
            ->setCodLocal($snapshot['establishment_code'] ?? '0000');

        return (new SunatCompany)->setRuc($snapshot['ruc'])->setRazonSocial($this->cdata($snapshot['name']))->setAddress($address);
    }

    /**
     * Greenter wraps raw fields in CDATA and applies Twig's spaceless filter.
     * Entity-escaped text outside that wrapper preserves spaces and CDATA terminators.
     */
    private function cdata(string $value): string
    {
        return ']]>'.htmlspecialchars($value, ENT_XML1 | ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'<![CDATA[';
    }

    public function document(Invoice $invoice): DocumentInterface
    {
        $customer = $invoice->customer_snapshot;
        $client = (new Client)->setTipoDoc($customer['document_type'])->setNumDoc($customer['document_number'])->setRznSocial($this->cdata($customer['name']));
        $model = in_array($invoice->document_type, ['01', '03']) ? new SunatInvoice : new Note;
        $totals = $invoice->totals;
        $model->setUblVersion('2.1')->setTipoDoc($invoice->document_type)->setSerie($invoice->series)
            ->setCorrelativo((string) $invoice->number)->setFechaEmision($invoice->issued_at->setTime((int) $invoice->created_at->format('H'), (int) $invoice->created_at->format('i'), (int) $invoice->created_at->format('s')))
            ->setTipoMoneda('PEN')->setCompany($this->issuer($invoice->company_snapshot))->setClient($client)
            ->setMtoOperGravadas((float) $totals['taxable'])->setMtoOperExoneradas((float) $totals['exonerated'])
            ->setMtoOperInafectas((float) $totals['unaffected'])->setMtoIGV((float) $totals['tax'])
            ->setTotalImpuestos((float) $totals['tax'])->setMtoImpVenta((float) $totals['total'])
            ->setValorVenta((float) $totals['subtotal'])->setSubTotal((float) $totals['total']);
        if ($model instanceof SunatInvoice) {
            $model->setTipoOperacion('0101')->setFormaPago(new FormaPagoContado);
        } else {
            $reference = $invoice->reference;
            $model->setCodMotivo($invoice->reason_code)->setDesMotivo($invoice->reason)
                ->setTipDocAfectado($reference->document_type)->setNumDocfectado($reference->series.'-'.$reference->number);
        }
        $details = [];
        foreach ($invoice->items as $item) {
            $detail = (new SaleDetail)->setCodProducto($item['code'])->setUnidad($item['unit_code'])
                ->setCantidad((float) $item['quantity'])->setDescripcion($this->cdata($item['name']))
                ->setMtoValorUnitario((float) ($item['original_unit_value'] ?? $item['unit_value']))->setMtoPrecioUnitario((float) $item['effective_price'])
                ->setMtoValorVenta((float) $item['base'])->setMtoBaseIgv((float) $item['base'])
                ->setPorcentajeIgv((float) $item['tax_rate'])->setIgv((float) $item['tax'])
                ->setTipAfeIgv($item['tax_code'])->setTotalImpuestos((float) $item['tax']);
            if (isset($item['discount_base']) && bccomp($item['discount_base'], '0', 2) > 0) {
                $detail->setDescuentos([(new Charge)->setCodTipo($item['tax_code'] === '10' ? '00' : '01')
                    ->setMontoBase((float) $item['original_base'])->setMonto((float) $item['discount_base'])
                    ->setFactor((float) bcdiv($item['discount_base'], $item['original_base'], 5))]);
            }
            $details[] = $detail;
        }
        $formatter = new \NumberFormatter('es_PE', \NumberFormatter::SPELLOUT);
        [$whole, $cents] = explode('.', $totals['total']);
        $legend = mb_strtoupper($formatter->format((int) $whole).' CON '.$cents.'/100 SOLES');

        return $model->setDetails($details)->setLegends([(new Legend)->setCode('1000')->setValue($legend)]);
    }

    public function batch(Submission $submission): DocumentInterface
    {
        $invoices = Invoice::where('company_id', $submission->company_id)->whereIn('id', $submission->document_ids)->get();
        $issuer = $this->issuer($invoices->first()->company_snapshot);
        $correlative = substr($submission->identifier, strrpos($submission->identifier, '-') + 1);
        if ($submission->kind === 'voided') {
            $details = $invoices->map(fn (Invoice $i) => (new VoidedDetail)->setTipoDoc($i->document_type)->setSerie($i->series)
                ->setCorrelativo((string) $i->number)->setDesMotivoBaja($this->cdata($submission->operations[(string) $i->id]['reason'])))->all();

            return (new Voided)->setCorrelativo($correlative)->setFecGeneracion($submission->reference_date)
                ->setFecComunicacion($submission->created_at)->setCompany($issuer)->setDetails($details);
        }
        $details = [];
        foreach ($invoices as $invoice) {
            $t = $invoice->totals;
            $c = $invoice->customer_snapshot;
            $detail = (new SummaryDetail)->setTipoDoc($invoice->document_type)->setSerieNro($invoice->series.'-'.$invoice->number)
                ->setClienteTipo($c['document_type'])->setClienteNro($c['document_number'])
                ->setEstado($submission->operations[(string) $invoice->id]['code'] ?? '1')
                ->setTotal((float) $t['total'])->setMtoOperGravadas((float) $t['taxable'])
                ->setMtoOperExoneradas((float) $t['exonerated'])->setMtoOperInafectas((float) $t['unaffected'])->setMtoIGV((float) $t['tax']);
            if ($invoice->reference_id) {
                $r = $invoice->reference;
                $detail->setDocReferencia((new Document)->setTipoDoc($r->document_type)->setNroDoc($r->series.'-'.$r->number));
            }
            $details[] = $detail;
        }

        return (new Summary)->setCorrelativo($correlative)->setFecGeneracion($submission->reference_date)
            ->setFecResumen($submission->created_at)->setMoneda('PEN')->setCompany($issuer)->setDetails($details);
    }

    public function consult(Submission $submission): mixed
    {
        if ($submission->ticket) {
            $service = new ExtService;
            $service->setClient($this->soap($submission->company, $submission->environment));

            return $service->getStatus($submission->ticket);
        }
        if ($submission->kind !== 'document' || $submission->environment === 'beta') {
            return null;
        }
        $invoice = Invoice::findOrFail($submission->document_ids[0]);
        $company = $submission->company;
        $service = new ConsultCdrService;
        $service->setClient($this->soap($company, 'consult'));

        return $service->getStatusCdr($company->ruc, $invoice->document_type, $invoice->series, $invoice->number);
    }

    public function send(Submission $submission): mixed
    {
        $see = $this->client($submission->company, $submission->environment);
        $model = $submission->kind === 'document' ? $this->document(Invoice::findOrFail($submission->document_ids[0])) : $this->batch($submission);
        if (! $submission->xml_path) {
            $path = 'sunat/'.$submission->company_id.'/'.$submission->environment.'/'.$submission->identifier.'.xml';
            Storage::disk('local')->put($path, $see->getXmlSigned($model));
            $submission->update(['xml_path' => $path]);
        }
        $sender = (new WsSenderResolver($this->soap($submission->company, $submission->environment), null))->find(get_class($model));

        return $sender->send($model->getName(), Storage::disk('local')->get($submission->xml_path));
    }

    private function soap(Company $company, string $environment): SoapClient
    {
        $wsdl = $environment === 'consult' ? WsdlProvider::getConsultPath() : WsdlProvider::getBillPath();
        $client = new SoapClient($wsdl, [
            'connection_timeout' => 20,
            'stream_context' => stream_context_create(['http' => ['timeout' => 40], 'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]),
            'exceptions' => true, 'trace' => false,
        ]);
        $client->setService(config('sunat.'.$environment));
        $client->setCredentials($company->ruc.$company->sol_user, $company->sol_password);

        return $client;
    }
}
