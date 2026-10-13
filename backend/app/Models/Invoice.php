<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['customer_snapshot' => 'array', 'company_snapshot' => 'array', 'items' => 'array', 'totals' => 'array', 'issued_at' => 'immutable_date', 'accepted_at' => 'immutable_datetime', 'delivered' => 'boolean'];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function reference(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reference_id');
    }
}
