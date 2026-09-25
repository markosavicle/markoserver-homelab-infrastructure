<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class TenantFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->company() . ' Salon';
        return [
            'name' => $name,
            'slug' => Str::slug($name),
        ];
    }
}
