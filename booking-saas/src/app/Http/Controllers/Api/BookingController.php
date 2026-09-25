<?php

namespace App\Http/Controllers/Api;

use App\Http/Controllers\Controller;
use App\Http/Requests/StoreBookingRequest;
use App\Models\Service;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class BookingController extends Controller
{
    public function __construct(protected BookingService $bookingService) {}

    /**
     * Get available slots for a given service and date.
     */
    public function availableSlots(Request $request, Service $service): JsonResponse
    {
        $request->validate([
            'date' => 'required|date_format:Y-m-d',
        ]);

        $slots = $this->bookingService->getAvailableSlots($service, $request->query('date'));

        return response()->json(['data' => $slots]);
    }

    /**
     * Store a new appointment booking.
     */
    public function store(StoreBookingRequest $request): JsonResponse
    {
        try {
            $user = $request->user();

            $appointment = $this->bookingService->createBooking(
                tenantId: $user->tenant_id,
                serviceId: $request->validated('service_id'),
                userId: $user->id,
                startTime: $request->validated('start_time')
            );

            return response()->json([
                'message' => 'Booking confirmed successfully.',
                'data' => $appointment,
            ], 201);
        } catch (Exception $e) {
            $status = $e->getCode() === 409 ? 409 : 400;
            return response()->json(['error' => $e->getMessage()], $status);
        }
    }
}
