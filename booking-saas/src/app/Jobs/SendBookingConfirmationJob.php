<?php

namespace App\Jobs;

use App\Mail\BookingConfirmationMail;
use App\Models\Appointment;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendBookingConfirmationJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public Appointment $appointment) {}

    public function handle(): void
    {
        // Load relationships safely inside the queue worker
        $this->appointment->load(['user', 'service', 'tenant']);

        if ($this->appointment->user && $this->appointment->user->email) {
            Mail::to($this->appointment->user->email)->send(
                new BookingConfirmationMail($this->appointment)
            );

            Log::info("Booking confirmation email sent to {$this->appointment->user->email} for Appointment #{$this->appointment->id}");
        }
    }
}
