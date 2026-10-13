<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DirectoryController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\SubmissionController;
use App\Models\CatalogEntry;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('auth/forgot-password', [AuthController::class, 'forgot'])->middleware('throttle:3,1');
    Route::post('auth/reset-password', [AuthController::class, 'reset'])->middleware('throttle:5,1');
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('catalogs', fn () => CatalogEntry::whereIn('catalog', ['01', '03', '06', '07', '09', '10', '19'])->get()->groupBy('catalog'));
        Route::get('admin', [AdminController::class, 'index']);
        Route::post('admin/companies', [AdminController::class, 'company']);
        Route::patch('admin/companies/{id}/status', [AdminController::class, 'status']);
        Route::post('admin/plans', [AdminController::class, 'plan']);
        Route::put('admin/plans/{id}', [AdminController::class, 'plan']);
        Route::post('admin/payments', [AdminController::class, 'payment']);
        Route::post('admin/users', [AdminController::class, 'user']);
        Route::put('admin/users/{id}', [AdminController::class, 'updateUser']);
        Route::post('admin/companies/{id}/plan', [AdminController::class, 'changePlan']);
        Route::middleware('company')->group(function () {
            Route::get('dashboard', [DashboardController::class, 'show']);
            Route::get('reports/sales', [DashboardController::class, 'report']);
            Route::get('company', [CompanyController::class, 'show']);
            Route::post('company', [CompanyController::class, 'save']);
            Route::get('account', [CompanyController::class, 'account']);
            Route::get('invoices', [InvoiceController::class, 'index']);
            Route::post('invoices', [InvoiceController::class, 'store']);
            Route::get('invoices/{id}', [InvoiceController::class, 'show']);
            Route::get('invoices/{id}/qr', [InvoiceController::class, 'qr']);
            Route::post('invoices/{id}/deliver', [InvoiceController::class, 'deliver']);
            Route::get('submissions', [SubmissionController::class, 'index']);
            Route::post('submissions', [SubmissionController::class, 'store']);
            Route::post('submissions/{id}/retry', [SubmissionController::class, 'retry']);
            Route::get('submissions/{id}/{format}', [SubmissionController::class, 'download']);
            Route::get('products/{id}/image', [DirectoryController::class, 'image']);
            Route::get('{resource}', [DirectoryController::class, 'index'])->whereIn('resource', ['customers', 'products', 'series', 'establishments', 'warehouses']);
            Route::post('{resource}', [DirectoryController::class, 'save'])->whereIn('resource', ['customers', 'products', 'series', 'establishments', 'warehouses']);
            Route::put('{resource}/{id}', [DirectoryController::class, 'save'])->whereIn('resource', ['customers', 'products', 'series', 'establishments', 'warehouses']);
        });
    });
});
