<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingPeriod extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['starts_at' => 'immutable_date', 'ends_at' => 'immutable_date', 'due_at' => 'immutable_date', 'price' => 'decimal:2'];
    }
}
