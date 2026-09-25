<?php

namespace Tests\Feature;

use App\Jobs\TestQueueJob;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class QueueSystemTest extends TestCase
{
    public function test_jobs_can_be_pushed_to_the_redis_queue(): void
    {
        // Fake the queue so we don't actually process it during testing, 
        // we just want to ensure Laravel is configured to dispatch it successfully.
        Queue::fake();

        // Dispatch the job we created earlier
        TestQueueJob::dispatch();

        // Assert the job was pushed to the queue
        Queue::assertPushed(TestQueueJob::class);
    }
}
