<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CompanyAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_if($user->role === 'admin' && ! $request->isMethodSafe(), 403, 'El administrador solo puede consultar los registros operativos de las empresas.');
        $companyId = $user->role === 'admin' ? $request->header('X-Company-Id') : $user->company_id;
        abort_unless($companyId, 403, 'Selecciona una empresa.');
        $company = Company::findOrFail($companyId);
        $request->attributes->set('company', $company);

        return $next($request);
    }
}
