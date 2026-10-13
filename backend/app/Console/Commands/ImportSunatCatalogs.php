<?php

namespace App\Console\Commands;

use App\Services\CatalogImporter;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('sunat:import-catalogs {path?}')]
#[Description('Importa catálogos, códigos y referencias de validación del Excel SUNAT')]
class ImportSunatCatalogs extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(CatalogImporter $importer): int
    {
        $count = $importer->import($this->argument('path') ?? config('sunat.catalog_file'));
        $this->info("Importados $count registros SUNAT.");

        return self::SUCCESS;
    }
}
