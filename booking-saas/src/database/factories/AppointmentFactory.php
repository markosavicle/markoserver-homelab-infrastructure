<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

class AppointmentFactory extends Factory
{
    public function definition(): array
    {
        $startTime = Carbon::now()->addDays(rand(1, 14))->setHour(rand(9, 16))->setMinute(0)->setSecond(0);
        $duration = fake()->randomElement([30, 60]);

        return [
            'tenant_id' => Tenant::factory(),
            'service_id' => Service::factory(),
            'user_id' => User::factory(),
            'start_time' => $startTime,
            'end_time' => (clone $startTime)->addMinutes($duration),
            'status' => fake()->randomElement(['pending', 'confirmed', 'canceled']),
        ];
    }
}
