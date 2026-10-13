<?php

namespace App\Http\Controllers;

use App\Models\CatalogEntry;
use App\Models\Company;
use App\Models\Customer;
use App\Models\DocumentSeries;
use App\Models\Establishment;
use App\Models\Product;
use App\Models\Warehouse;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DirectoryController extends Controller
{
    private function model(string $resource): string
    {
        return match ($resource) {
            'customers' => Customer::class, 'products' => Product::class, 'establishments' => Establishment::class, 'series' => DocumentSeries::class, 'warehouses' => Warehouse::class, default => abort(404)
        };
    }

    public function index(Request $request, string $resource): mixed
    {
        $model = $this->model($resource);
        $query = $model::where('company_id', $request->attributes->get('company')->id);
        if ($request->filled('search')) {
            $search = '%'.$request->string('search').'%';
            $query->where(function ($q) use ($search, $resource) {
                $q->where($resource === 'series' ? 'code' : 'name', 'like', $search);
                if ($resource === 'customers') {
                    $q->orWhere('document_number', 'like', $search);
                }
                if ($resource === 'products') {
                    $q->orWhere('code', 'like', $search);
                }
            });
        }

        return $query->orderByDesc('id')->paginate(min(500, max(1, (int) $request->input('per_page', 50))));
    }

    public function save(Request $request, string $resource, ?int $id = null): mixed
    {
        $company = $request->attributes->get('company');
        if (in_array($resource, ['series', 'establishments', 'warehouses'])) {
            abort_if($request->user()->role === 'operator', 403);
        }
        $rules = match ($resource) {
            'customers' => ['document_type' => ['required', Rule::in(CatalogEntry::where('catalog', '06')->pluck('code')->all())], 'document_number' => ['required', 'string', 'max:20', Rule::unique('customers')->where('company_id', $company->id)->where('document_type', $request->input('document_type'))->ignore($id)], 'name' => 'required|string|max:255', 'address' => 'nullable|string|max:255', 'email' => 'nullable|email|max:255', 'phone' => 'nullable|string|max:30'],
            'products' => ['name' => 'required|string|max:255', 'price' => 'required|numeric|min:0.01|max:999999999|decimal:0,6', 'kind' => 'required|in:product,service', 'unit_code' => ['required', Rule::in(CatalogEntry::where('catalog', '03')->pluck('code')->all())], 'tax_code' => 'required|in:10,20,30', 'image' => 'nullable|image|max:2048'],
            'establishments' => ['code' => ['required', 'regex:/^\d{4}$/', Rule::unique('establishments')->where('company_id', $company->id)->ignore($id)], 'name' => 'required|string|max:255', 'address' => 'required|string|max:255'],
            'series' => ['document_type' => 'required|in:01,03,07,08', 'code' => ['required', 'regex:/^[FB][A-Z0-9]{3}$/', Rule::unique('document_series')->where('company_id', $company->id)->where('document_type', $request->input('document_type'))->ignore($id)], 'establishment_id' => ['required', Rule::exists('establishments', 'id')->where('company_id', $company->id)]],
            'warehouses' => ['name' => 'required|string|max:255', 'address' => 'required|string|max:255'],
            default => abort(404),
        };
        $data = $request->validate($rules);
        if ($resource === 'customers') {
            $length = match ($data['document_type']) {
                '1' => 8, '6' => 11, default => null
            };
            if ($length && ! preg_match('/^\d{'.$length.'}$/', $data['document_number'])) {
                throw ValidationException::withMessages(['document_number' => "El documento requiere $length dígitos."]);
            }
        }
        if ($resource === 'series' && (($data['document_type'] === '01' && $data['code'][0] !== 'F') || ($data['document_type'] === '03' && $data['code'][0] !== 'B'))) {
            throw ValidationException::withMessages(['code' => 'La factura requiere serie F y la boleta serie B.']);
        }

        return DB::transaction(function () use ($request, $company, $resource, $id, $data) {
            Company::whereKey($company->id)->lockForUpdate()->firstOrFail();
            app(SubscriptionService::class)->assertWritable($company);
            $model = $this->model($resource);
            $record = $id ? $model::where('company_id', $company->id)->findOrFail($id) : new $model;
            if ($id && $resource === 'series' && $record->next_number > 1) {
                throw ValidationException::withMessages(['series' => 'Una serie utilizada no se puede modificar.']);
            }
            unset($data['image']);
            if ($resource === 'products') {
                $data['tax_rate'] = $data['tax_code'] === '10' ? '18.00' : '0.00';
                if (! $id) {
                    $data['code'] = 'P-'.strtoupper((string) Str::ulid());
                }
                if ($request->hasFile('image')) {
                    $data['image_path'] = $request->file('image')->store('products/'.$company->id, 'local');
                }
            }
            if (array_key_exists('address', $data) && $data['address'] === null) {
                $data['address'] = '';
            }
            $record->fill([...$data, 'company_id' => $company->id])->save();

            return $record;
        });
    }

    public function image(Request $request, int $id): mixed
    {
        $product = Product::where('company_id', $request->attributes->get('company')->id)->findOrFail($id);
        abort_unless($product->image_path, 404);

        return Storage::disk('local')->response($product->image_path);
    }
}
