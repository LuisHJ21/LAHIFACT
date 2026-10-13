<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class TaxCalculator
{
    /**
     * Create a new class instance.
     */
    public function round(string $value, int $scale = 2): string
    {
        return bcadd($value, '0.'.str_repeat('0', $scale).'5', $scale);
    }

    public function calculate(array $lines, string $globalDiscount = '0'): array
    {
        $totals = ['taxable' => '0.00', 'exonerated' => '0.00', 'unaffected' => '0.00', 'tax' => '0.00', 'total' => '0.00', 'discount' => '0.00'];
        $items = [];
        foreach ($lines as $line) {
            $quantity = (string) $line['quantity'];
            $price = (string) $line['price'];
            $discount = (string) ($line['discount_percent'] ?? '0');
            if (bccomp($quantity, '0', 6) <= 0 || bccomp($price, '0', 6) < 0) {
                throw ValidationException::withMessages(['items' => 'Cantidad o precio inválidos.']);
            }
            foreach ([$discount, $globalDiscount] as $percent) {
                if (bccomp($percent, '0', 6) < 0 || bccomp($percent, '100', 6) > 0) {
                    throw ValidationException::withMessages(['discount' => 'El descuento debe estar entre 0 y 100.']);
                }
            }
            $gross = $this->round(bcmul($price, $quantity, 10));
            $afterLine = $this->round(bcmul($gross, bcsub('1', bcdiv($discount, '100', 10), 10), 10));
            $net = $this->round(bcmul($afterLine, bcsub('1', bcdiv($globalDiscount, '100', 10), 10), 10));
            $taxed = $line['tax_code'] === '10';
            $rate = $taxed ? (string) ($line['tax_rate'] ?? '18') : '0';
            $factor = bcadd('1', bcdiv($rate, '100', 10), 10);
            $base = $taxed ? $this->round(bcdiv($net, $factor, 10)) : $net;
            $originalBase = $taxed ? $this->round(bcdiv($gross, $factor, 10)) : $gross;
            $tax = bcsub($net, $base, 2);
            $category = match ($line['tax_code']) {
                '10' => 'taxable', '20' => 'exonerated', '30' => 'unaffected', default => throw ValidationException::withMessages(['tax_code' => 'Afectación no soportada en esta etapa.'])
            };
            $totals[$category] = bcadd($totals[$category], $base, 2);
            $totals['tax'] = bcadd($totals['tax'], $tax, 2);
            $totals['total'] = bcadd($totals['total'], $net, 2);
            $totals['discount'] = bcadd($totals['discount'], bcsub($gross, $net, 2), 2);
            $items[] = [...$line, 'quantity' => $quantity, 'price' => $price, 'tax_rate' => $rate,
                'unit_value' => bcdiv(bcdiv($net, $quantity, 10), $factor, 10),
                'original_unit_value' => bcdiv($price, $factor, 10), 'original_base' => $originalBase, 'discount_base' => bcsub($originalBase, $base, 2),
                'effective_price' => bcdiv($net, $quantity, 10), 'base' => $base, 'tax' => $tax, 'total' => $net,
                'discount' => bcsub($gross, $net, 2), 'discount_percent' => $discount, 'global_discount_percent' => $globalDiscount];
        }
        $totals['subtotal'] = bcsub($totals['total'], $totals['tax'], 2);
        if (bccomp($totals['total'], '999999999999.99', 2) > 0) {
            throw ValidationException::withMessages(['items' => 'El total excede la longitud monetaria permitida por SUNAT.']);
        }

        return ['items' => $items, 'totals' => $totals];
    }
}
