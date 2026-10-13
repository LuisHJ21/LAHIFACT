<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Credenciales incorrectas.']);
        }

        return response()->json(['user' => $user->load('company'), 'token' => $user->createToken('web', ['*'], now()->addHours(12))->plainTextToken]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('company'));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Sesión cerrada.']);
    }

    public function forgot(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        Password::sendResetLink($request->only('email'));

        return response()->json(['message' => 'Si el correo está registrado, recibirás un enlace de recuperación.']);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email', 'token' => 'required|string', 'password' => 'required|confirmed|min:12']);
        $status = Password::reset($data, function (User $user, string $password) {
            $user->password = $password;
            $user->save();
            $user->tokens()->delete();
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => 'El enlace expiró o no es válido.']);
        }

        return response()->json(['message' => 'Contraseña actualizada.']);
    }
}
