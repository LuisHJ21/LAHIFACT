<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $t) {
            $t->id();
            $t->string('ruc', 11)->unique();
            $t->string('name');
            $t->string('address')->default('');
            $t->string('ubigeo', 6)->default('');
            $t->string('department')->default('');
            $t->string('province')->default('');
            $t->string('district')->default('');
            $t->string('environment')->default('beta');
            $t->string('status')->default('active');
            $t->text('sol_user')->nullable();
            $t->text('sol_password')->nullable();
            $t->text('certificate')->nullable();
            $t->text('certificate_password')->nullable();
            $t->timestamps();
        });
        Schema::table('users', function (Blueprint $t) {
            $t->foreignId('company_id')->nullable()->constrained();
            $t->string('role')->default('operator');
        });
        Schema::create('plans', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->unsignedInteger('monthly_quota');
            $t->unsignedInteger('annual_quota');
            $t->unsignedInteger('user_limit');
            $t->decimal('monthly_price', 12, 2);
            $t->decimal('annual_price', 12, 2);
            $t->timestamps();
        });
        Schema::create('subscriptions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->unique()->constrained();
            $t->foreignId('plan_id')->constrained();
            $t->string('frequency');
            $t->date('starts_at');
            $t->timestamps();
        });
        Schema::create('billing_periods', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained();
            $t->date('starts_at');
            $t->date('ends_at');
            $t->date('due_at');
            $t->unsignedInteger('quota');
            $t->unsignedInteger('user_limit');
            $t->decimal('price', 12, 2);
            $t->timestamps();
            $t->unique(['company_id', 'starts_at']);
        });
        Schema::create('payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained();
            $t->foreignId('billing_period_id')->constrained();
            $t->decimal('amount', 12, 2);
            $t->date('paid_at');
            $t->string('reference');
            $t->foreignId('recorded_by')->constrained('users');
            $t->timestamps();
        });
        Schema::create('customers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained();
            $t->string('document_type', 2);
            $t->string('document_number', 20);
            $t->string('name');
            $t->string('address')->default('');
            $t->string('email')->nullable();
            $t->string('phone')->nullable();
            $t->timestamps();
            $t->unique(['company_id', 'document_type', 'document_number']);
        });
        Schema::create('products', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained();
            $t->string('code');
            $t->string('name');
            $t->decimal('price', 16, 6);
            $t->string('kind');
            $t->string('unit_code', 5);
            $t->string('tax_code', 2);
            $t->decimal('tax_rate', 5, 2)->default(18);
            $t->string('image_path')->nullable();
            $t->timestamps();
            $t->unique(['company_id', 'code']);
        });
        Schema::create('establishments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained();
            $t->string('code', 4);
            $t->string('name');
            $t->string('address');
            $t->timestamps();
            $t->unique(['company_id', 'code']);
        });
        Schema::create('document_series', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained();
            $t->foreignId('establishment_id')->constrained();
            $t->string('document_type', 2);
            $t->string('code', 4);
            $t->unsignedInteger('next_number')->default(1);
            $t->timestamps();
            $t->unique(['company_id', 'document_type', 'code']);
        });
        Schema::create('warehouses', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained();
            $t->string('name');
            $t->string('address');
            $t->timestamps();
        });
        Schema::create('invoices', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained();
            $t->foreignId('customer_id')->constrained();
            $t->foreignId('document_series_id')->constrained();
            $t->string('document_type', 2);
            $t->string('series', 4);
            $t->unsignedInteger('number');
            $t->date('issued_at');
            $t->string('currency', 3)->default('PEN');
            $t->string('environment')->default('beta');
            $t->string('status')->default('draft');
            $t->json('customer_snapshot');
            $t->json('company_snapshot');
            $t->json('items');
            $t->json('totals');
            $t->foreignId('reference_id')->nullable()->constrained('invoices');
            $t->string('reason_code', 2)->nullable();
            $t->string('reason')->nullable();
            $t->boolean('delivered')->default(false);
            $t->timestamp('accepted_at')->nullable();
            $t->timestamps();
            $t->unique(['company_id', 'document_type', 'series', 'number']);
        });
        Schema::create('submissions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained();
            $t->string('kind');
            $t->string('identifier');
            $t->string('environment');
            $t->date('reference_date');
            $t->json('document_ids');
            $t->json('operations')->nullable();
            $t->string('status')->default('queued');
            $t->string('ticket')->nullable();
            $t->unsignedInteger('attempts')->default(0);
            $t->string('xml_path')->nullable();
            $t->string('cdr_path')->nullable();
            $t->string('response_code')->nullable();
            $t->text('message')->nullable();
            $t->timestamp('next_attempt_at')->nullable();
            $t->timestamps();
            $t->unique(['company_id', 'identifier']);
        });
        Schema::create('quota_entries', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained();
            $t->foreignId('invoice_id')->unique()->constrained();
            $t->foreignId('billing_period_id')->constrained();
            $t->string('status');
            $t->timestamp('consumed_at')->nullable();
            $t->timestamps();
        });
        Schema::create('catalog_entries', function (Blueprint $t) {
            $t->id();
            $t->string('catalog');
            $t->string('code');
            $t->text('description');
            $t->json('metadata')->nullable();
            $t->string('source_version');
            $t->timestamps();
            $t->unique(['catalog', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['catalog_entries', 'quota_entries', 'submissions', 'invoices', 'warehouses', 'document_series', 'establishments', 'products', 'customers', 'payments', 'billing_periods', 'subscriptions', 'plans'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('users', fn (Blueprint $t) => $t->dropConstrainedForeignId('company_id'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('role'));
        Schema::dropIfExists('companies');
    }
};
