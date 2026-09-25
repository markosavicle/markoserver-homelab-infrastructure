<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Appointment $appointment) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Booking Confirmation - ' . $this->appointment->tenant->name,
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: "
                <h1>Booking Confirmed!</h1>
                <p>Hello {$this->appointment->user->name},</p>
                <p>Your appointment for <strong>{$this->appointment->service->name}</strong> at <strong>{$this->appointment->tenant->name}</strong> has been confirmed.</p>
                <p><strong>Date & Time:</strong> {$this->appointment->start_time}</p>
            ",
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
