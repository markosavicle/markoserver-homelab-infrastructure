<?php

namespace App\Http/Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'service_id' => 'required|exists:services,id',
            'start_time' => 'required|date_format:Y-m-d H:i:s|after:now',
        ];
    }
}
