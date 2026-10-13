<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['monthly_price' => 'decimal:2', 'annual_price' => 'decimal:2'];
    }
}
