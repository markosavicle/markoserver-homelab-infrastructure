<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create a Global SuperAdmin (No tenant attached)
        User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
            'tenant_id' => null,
        ]);

        // 2. Create 2 Sample Tenants
        $tenantA = Tenant::factory()->create([
            'name' => 'Glow Beauty Salon',
            'slug' => 'glow-beauty',
        ]);

        $tenantB = Tenant::factory()->create([
            'name' => 'Apex Dental Clinic',
            'slug' => 'apex-dental',
        ]);

        // 3. Populate Tenant A (Glow Beauty)
        $adminA = User::factory()->create([
            'tenant_id' => $tenantA->id,
            'name' => 'Glow Admin',
            'email' => 'admin@glow.com',
            'password' => Hash::make('password'),
            'role' => 'tenantadmin',
        ]);

        $servicesA = Service::factory()->createMany([
            ['tenant_id' => $tenantA->id, 'name' => 'Haircut & Styling', 'duration_minutes' => 60, 'price' => 50.00],
            ['tenant_id' => $tenantA->id, 'name' => 'Manicure', 'duration_minutes' => 30, 'price' => 30.00],
        ]);

        $customersA = User::factory(5)->create([
            'tenant_id' => $tenantA->id,
            'role' => 'customer',
        ]);

        foreach ($customersA as $customer) {
            Appointment::factory()->create([
                'tenant_id' => $tenantA->id,
                'service_id' => $servicesA->random()->id,
                'user_id' => $customer->id,
            ]);
        }

        // 4. Populate Tenant B (Apex Dental)
        $adminB = User::factory()->create([
            'tenant_id' => $tenantB->id,
            'name' => 'Apex Admin',
            'email' => 'admin@apex.com',
            'password' => Hash::make('password'),
            'role' => 'tenantadmin',
        ]);

        $servicesB = Service::factory()->createMany([
            ['tenant_id' => $tenantB->id, 'name' => 'Teeth Cleaning', 'duration_minutes' => 45, 'price' => 80.00],
            ['tenant_id' => $tenantB->id, 'name' => 'Root Canal', 'duration_minutes' => 90, 'price' => 300.00],
        ]);

        $customersB = User::factory(3)->create([
            'tenant_id' => $tenantB->id,
            'role' => 'customer',
        ]);

        foreach ($customersB as $customer) {
            Appointment::factory()->create([
                'tenant_id' => $tenantB->id,
                'service_id' => $servicesB->random()->id,
                'user_id' => $customer->id,
            ]);
        }
    }
}
