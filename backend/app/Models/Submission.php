<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Submission extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['document_ids' => 'array', 'operations' => 'array', 'reference_date' => 'immutable_date', 'next_attempt_at' => 'immutable_datetime'];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
