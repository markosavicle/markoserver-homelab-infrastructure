<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServiceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->randomElement(['Haircut & Styling', 'Deep Tissue Massage', 'Dental Checkup', 'Beard Trim']),
            'duration_minutes' => fake()->randomElement([30, 45, 60]),
            'price' => fake()->randomFloat(2, 25, 150),
        ];
    }
}
