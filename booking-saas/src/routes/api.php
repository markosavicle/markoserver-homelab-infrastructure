<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

use App\Http\Controllers\Api\BookingController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/services/{service}/slots', [BookingController::class, 'availableSlots']);
    Route::post('/bookings', [BookingController::class, 'store']);
});
