<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function show(Request $request, SubscriptionService $subscriptions): mixed
    {
        $company = $request->attributes->get('company');
        $q = Invoice::where('company_id', $company->id)->where('status', 'accepted');
        $invoices = $q->get();
        $sales = '0.00';
        $tax = '0.00';
        foreach ($invoices as $i) {
            $sign = $i->document_type === '07' ? '-1' : '1';
            $sales = bcadd($sales, bcmul($i->totals['total'], $sign, 2), 2);
            $tax = bcadd($tax, bcmul($i->totals['tax'], $sign, 2), 2);
        }
        $days = [];
        for ($n = 6; $n >= 0; $n--) {
            $date = today()->subDays($n)->toDateString();
            $amount = '0.00';
            foreach ($invoices->filter(fn ($i) => $i->issued_at->toDateString() === $date) as $i) {
                $amount = bcadd($amount, bcmul($i->totals['total'], $i->document_type === '07' ? '-1' : '1', 2), 2);
            }
            $days[] = ['date' => $date, 'total' => $amount];
        }

        return ['sales' => $sales, 'tax' => $tax, 'invoice_count' => $invoices->whereIn('document_type', ['01', '03'])->count(), 'customer_count' => Customer::where('company_id', $company->id)->count(),
            'days' => $days, 'recent' => Invoice::where('company_id', $company->id)->latest()->limit(8)->get(), 'account' => $subscriptions->account($company)];
    }

    public function report(Request $request): mixed
    {
        abort_if($request->user()->role === 'operator', 403);
        $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d|after_or_equal:from']);
        $q = Invoice::where('company_id', $request->attributes->get('company')->id);
        if ($request->filled('from')) {
            $q->whereDate('issued_at', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $q->whereDate('issued_at', '<=', $request->input('to'));
        }

        return response()->streamDownload(function () use ($q) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Fecha', 'Tipo', 'Serie', 'Número', 'Cliente', 'Documento', 'Estado', 'Subtotal', 'IGV', 'Total'], ';', '"', '');
            foreach ($q->orderBy('id')->cursor() as $i) {
                $name = preg_replace('/^[=+@\-\t\r]/', "'", $i->customer_snapshot['name']);
                $document = preg_replace('/^[=+@\-\t\r]/', "'", $i->customer_snapshot['document_number']);
                fputcsv($out, [$i->issued_at->toDateString(), $i->document_type, $i->series, $i->number, $name, $document, $i->status, $i->totals['subtotal'], $i->totals['tax'], $i->totals['total']], ';', '"', '');
            }
            fclose($out);
        }, 'ventas.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
