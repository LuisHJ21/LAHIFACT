<?php

namespace App\Http\Controllers;

use App\Models\CatalogEntry;
use App\Models\DocumentSeries;
use App\Models\Invoice;
use App\Models\Submission;
use App\Services\InvoiceService;
use App\Services\SubscriptionService;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    public function index(Request $request): mixed
    {
        $q = Invoice::where('company_id', $request->attributes->get('company')->id);
        if ($request->input('group') === 'sales') {
            $q->whereIn('document_type', ['01', '03']);
        }
        if ($request->input('group') === 'notes') {
            $q->whereIn('document_type', ['07', '08']);
        }
        if ($request->input('group') === 'summary_pending') {
            $q->where('series', 'like', 'B%')->whereIn('status', ['draft', 'rejected']);
        }
        if ($request->filled('customer_id')) {
            $q->where('customer_id', $request->input('customer_id'));
        }
        foreach (['document_type', 'status'] as $field) {
            if ($request->filled($field)) {
                $q->where($field, $request->input($field));
            }
        }
        if ($request->filled('from')) {
            $q->whereDate('issued_at', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $q->whereDate('issued_at', '<=', $request->input('to'));
        }
        if ($request->filled('search')) {
            $s = '%'.$request->string('search').'%';
            $q->where(fn ($query) => $query->where('series', 'like', $s)->orWhereRaw('CAST(number AS TEXT) LIKE ?', [$s])->orWhereRaw("series || '-' || CAST(number AS TEXT) LIKE ?", [$s])->orWhere('customer_snapshot->name', 'like', $s)->orWhere('customer_snapshot->document_number', 'like', $s));
        }

        return $q->latest('id')->paginate(min(500, max(1, (int) $request->input('per_page', 50))));
    }

    public function show(Request $request, int $id): mixed
    {
        $invoice = Invoice::where('company_id', $request->attributes->get('company')->id)->findOrFail($id);
        $submissions = Submission::where('company_id', $invoice->company_id)->get()->filter(fn ($s) => in_array($invoice->id, $s->document_ids))->values();

        return ['invoice' => $invoice, 'submissions' => $submissions];
    }

    public function store(Request $request, InvoiceService $service): mixed
    {
        $data = $request->validate(['document_series_id' => 'required|integer', 'customer_id' => 'required|integer', 'issued_at' => 'required|date_format:Y-m-d|before_or_equal:today',
            'items' => 'required|array|min:1|max:100', 'items.*.product_id' => 'required|integer', 'items.*.quantity' => 'required|numeric|min:0.000001|max:999999|decimal:0,6',
            'items.*.price' => 'nullable|numeric|min:0.01|max:999999999|decimal:0,6', 'items.*.discount_percent' => 'nullable|numeric|min:0|max:100|decimal:0,6',
            'global_discount_percent' => 'nullable|numeric|min:0|max:100|decimal:0,6', 'reference_id' => 'nullable|integer', 'reason_code' => 'required_with:reference_id|string|max:2', 'reason' => 'required_with:reference_id|string|max:250']);
        if (! empty($data['reference_id'])) {
            $series = DocumentSeries::where('company_id', $request->attributes->get('company')->id)->findOrFail($data['document_series_id']);
            $catalog = $series->document_type === '07' ? '09' : '10';
            if (($series->document_type === '07' && $data['reason_code'] === '13') || ! CatalogEntry::where('catalog', $catalog)->where('code', $data['reason_code'])->exists()) {
                throw ValidationException::withMessages(['reason_code' => 'Motivo no válido en el catálogo SUNAT.']);
            }
        }

        return response()->json($service->create($request->attributes->get('company'), $data), 201);
    }

    public function deliver(Request $request, int $id): mixed
    {
        $company = $request->attributes->get('company');
        app(SubscriptionService::class)->assertWritable($company);
        $invoice = Invoice::where('company_id', $company->id)->findOrFail($id);
        $invoice->update(['delivered' => true]);

        return $invoice;
    }

    public function qr(Request $request, int $id): mixed
    {
        $invoice = Invoice::where('company_id', $request->attributes->get('company')->id)->findOrFail($id);
        $text = implode('|', [$invoice->company_snapshot['ruc'], $invoice->document_type, $invoice->series, $invoice->number,
            $invoice->totals['tax'], $invoice->totals['total'], $invoice->issued_at->toDateString(), $invoice->customer_snapshot['document_type'], $invoice->customer_snapshot['document_number']]);
        $renderer = new ImageRenderer(new RendererStyle(200), new SvgImageBackEnd);

        return response((new Writer($renderer))->writeString($text), 200, ['Content-Type' => 'image/svg+xml']);
    }
}
