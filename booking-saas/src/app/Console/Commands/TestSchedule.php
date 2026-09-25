<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class TestSchedule extends Command
{
    protected $signature = 'app:test-schedule';
    protected $description = 'Tests if the scheduler container is working';

    public function handle()
    {
        Log::info('⏰ Scheduler is ticking! Task executed successfully.');
    }
}
