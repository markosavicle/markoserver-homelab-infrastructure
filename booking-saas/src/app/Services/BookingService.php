<?php

namespace App\Services;

use App\Jobs\SendBookingConfirmationJob;
use App\Models\Appointment;
use App\Models\Service;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;
use Exception;

class BookingService
{
    /**
     * Get available booking slots for a given service and date.
     */
    public function getAvailableSlots(Service $service, string $date, string $businessStart = '09:00', string $businessEnd = '17:00'): array
    {
        $duration = $service->duration_minutes;
        $dayStart = Carbon::parse("{$date} {$businessStart}");
        $dayEnd = Carbon::parse("{$date} {$businessEnd}");

        $existingAppointments = Appointment::where('tenant_id', $service->tenant_id)
            ->where('status', '!=', 'canceled')
            ->whereDate('start_time', $date)
            ->get(['start_time', 'end_time']);

        $availableSlots = [];
        $period = CarbonPeriod::create($dayStart, "{$duration} minutes", $dayEnd->subMinutes($duration));

        foreach ($period as $slotStart) {
            $slotEnd = (clone $slotStart)->addMinutes($duration);

            $isOverlapping = $existingAppointments->contains(function ($appointment) use ($slotStart, $slotEnd) {
                return $slotStart < Carbon::parse($appointment->end_time) &&
                       $slotEnd > Carbon::parse($appointment->start_time);
            });

            if (!$isOverlapping) {
                $availableSlots[] = [
                    'start_time' => $slotStart->toDateTimeString(),
                    'end_time' => $slotEnd->toDateTimeString(),
                ];
            }
        }

        return $availableSlots;
    }

    /**
     * Create an appointment with pessimistic locking and dispatch notification job.
     */
    public function createBooking(int $tenantId, int $serviceId, int $userId, string $startTime): Appointment
    {
        $appointment = DB::transaction(function () use ($tenantId, $serviceId, $userId, $startTime) {
            $service = Service::findOrFail($serviceId);
            $start = Carbon::parse($startTime);
            $end = (clone $start)->addMinutes($service->duration_minutes);

            $conflictingBooking = Appointment::where('tenant_id', $tenantId)
                ->where('status', '!=', 'canceled')
                ->where(function ($query) use ($start, $end) {
                    $query->where('start_time', '<', $end)
                          ->where('end_time', '>', $start);
                })
                ->lockForUpdate()
                ->exists();

            if ($conflictingBooking) {
                throw new Exception('The selected time slot is no longer available.', 409);
            }

            return Appointment::create([
                'tenant_id' => $tenantId,
                'service_id' => $serviceId,
                'user_id' => $userId,
                'start_time' => $start,
                'end_time' => $end,
                'status' => 'confirmed',
            ]);
        });

        // Dispatch background job to Redis queue outside transaction scope
        SendBookingConfirmationJob::dispatch($appointment);

        return $appointment;
    }
}
