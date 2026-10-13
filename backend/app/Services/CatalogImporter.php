<?php

namespace App\Services;

use App\Models\CatalogEntry;
use DOMDocument;
use DOMXPath;
use Illuminate\Support\Facades\DB;
use ZipArchive;

class CatalogImporter
{
    /**
     * Create a new class instance.
     */
    public function import(string $path): int
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw new \RuntimeException('No se pudo abrir el Excel de SUNAT: '.$path);
        }
        try {
            $strings = [];
            $doc = new DOMDocument;
            $doc->loadXML($zip->getFromName('xl/sharedStrings.xml'), LIBXML_NONET);
            $xpath = new DOMXPath($doc);
            $xpath->registerNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
            foreach ($xpath->query('//s:si') as $si) {
                $text = '';
                foreach ($xpath->query('.//s:t', $si) as $node) {
                    $text .= $node->textContent;
                } $strings[] = $text;
            }
            $workbook = new DOMDocument;
            $workbook->loadXML($zip->getFromName('xl/workbook.xml'), LIBXML_NONET);
            $relations = new DOMDocument;
            $relations->loadXML($zip->getFromName('xl/_rels/workbook.xml.rels'), LIBXML_NONET);
            $targets = [];
            foreach ($relations->getElementsByTagName('Relationship') as $node) {
                $targets[$node->getAttribute('Id')] = $node->getAttribute('Target');
            }
            $count = 0;
            DB::transaction(function () use ($workbook, $targets, $zip, $strings, &$count) {
                foreach ($workbook->getElementsByTagName('sheet') as $sheet) {
                    $name = $sheet->getAttribute('name');
                    $id = $sheet->getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
                    $sheetDoc = new DOMDocument;
                    $sheetDoc->loadXML($zip->getFromName('xl/'.$targets[$id]), LIBXML_NONET);
                    $catalog = null;
                    $reading = false;
                    foreach ($sheetDoc->getElementsByTagName('row') as $row) {
                        $cells = [];
                        foreach ($row->getElementsByTagName('c') as $cell) {
                            $column = preg_replace('/\d+/', '', $cell->getAttribute('r'));
                            $value = $cell->getElementsByTagName('v')->item(0)?->textContent ?? '';
                            $cells[$column] = trim($cell->getAttribute('t') === 's' ? ($strings[(int) $value] ?? '') : $value);
                        }
                        if ($name === 'Catálogos') {
                            if (preg_match('/^No\.?$/i', $cells['A'] ?? '')) {
                                $catalog = str_pad($cells['B'] ?? '', 2, '0', STR_PAD_LEFT);
                                $reading = false;

                                continue;
                            }
                            if (str_contains(mb_strtolower($cells['A'] ?? ''), 'código') && isset($cells['B'])) {
                                $reading = true;

                                continue;
                            }
                            $code = $cells['A'] ?? '';
                            $description = $cells['B'] ?? '';
                            if ($catalog && $reading && $description !== '' && preg_match('/^[A-Z0-9\-]{1,10}$/', $code)) {
                                CatalogEntry::updateOrCreate(['catalog' => $catalog, 'code' => $code], ['description' => $description, 'metadata' => $cells, 'source_version' => '2026-08-26']);
                                $count++;
                            }
                        } elseif ($name === 'CódigosRetorno') {
                            if (preg_match('/^\d{4}$/', $cells['A'] ?? '')) {
                                CatalogEntry::updateOrCreate(['catalog' => 'return_codes', 'code' => $cells['A']], ['description' => $cells['B'] ?? '', 'metadata' => $cells, 'source_version' => '2026-08-26']);
                                $count++;
                            }
                        } elseif (in_array($name, ['General ', 'Firma', 'Factura2_0', 'Boleta2_0', 'NotaCredito2_0', 'NotaDebito2_0', 'Resumen Diario1_1', 'Comunicación de Baja1_0', 'Control de Cambios', 'Parámetros'])) {
                            if (count(array_filter($cells)) > 1) {
                                CatalogEntry::updateOrCreate(['catalog' => 'rules:'.trim($name), 'code' => $row->getAttribute('r')], ['description' => implode(' | ', array_filter($cells)), 'metadata' => $cells, 'source_version' => '2026-08-26']);
                                $count++;
                            }
                        }
                    }
                }
            });

            return $count;
        } finally {
            $zip->close();
        }
    }
}
