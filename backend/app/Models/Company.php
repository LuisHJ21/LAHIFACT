<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $guarded = [];

    protected $attributes = ['environment' => 'beta', 'status' => 'active', 'address' => '', 'ubigeo' => '', 'department' => '', 'province' => '', 'district' => ''];

    protected $hidden = ['sol_user', 'sol_password', 'certificate', 'certificate_password'];

    protected function casts(): array
    {
        return ['sol_user' => 'encrypted', 'sol_password' => 'encrypted', 'certificate' => 'encrypted', 'certificate_password' => 'encrypted'];
    }
}
