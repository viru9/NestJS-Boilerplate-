# Background Jobs Guide

This document covers background job processing using Bull/BullMQ with Redis.

## Overview

The backend uses **Bull** (backed by Redis) for asynchronous job processing. This is essential for:
- Long-running AI tasks
- Email sending (queue-based)
- Batch processing
- Scheduled tasks
- Retry logic for failed operations

## Architecture

```
┌─────────────────┐
│   API Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Add to Queue  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      Redis      │  (Job storage)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Bull Worker   │  (Job processor)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Job Complete  │
└─────────────────┘
```

## Configuration

### Environment Variables

```env
# Redis (used by Bull)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Module Setup

Bull is registered in `app.module.ts`:

```typescript
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    // Feature modules...
  ],
})
export class AppModule {}
```

## Queues

### AI Tasks Queue

**Queue Name**: `ai-tasks`

**Jobs:**
1. `generate-completion` - Generate AI chat completion
2. `generate-embeddings` - Generate text embeddings

**Location**: `src/modules/ai/processors/ai-task.processor.ts`

### Email Queue (Future)

**Queue Name**: `email`

**Jobs:**
1. `send-welcome` - Welcome email
2. `send-verification` - Email verification
3. `send-reset-password` - Password reset
4. `send-notification` - Generic notifications

## Creating Jobs

### 1. Register Queue in Module

```typescript
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai-tasks',
    }),
  ],
})
export class AiModule {}
```

### 2. Add Jobs to Queue

```typescript
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class AiService {
  constructor(
    @InjectQueue('ai-tasks') private aiQueue: Queue,
  ) {}

  async queueCompletion(
    userId: string,
    conversationId: string,
    message: string,
  ) {
    // Add job to queue
    const job = await this.aiQueue.add(
      'generate-completion',  // Job name
      {
        // Job data
        userId,
        conversationId,
        message,
        model: 'gpt-4',
        maxTokens: 4096,
        temperature: 0.7,
      },
      {
        // Job options
        attempts: 3,              // Retry 3 times
        backoff: {
          type: 'exponential',
          delay: 5000,            // Start with 5s delay
        },
        removeOnComplete: 100,    // Keep last 100 completed
        removeOnFail: 500,        // Keep last 500 failed
      }
    );

    return {
      jobId: job.id,
      status: 'queued',
    };
  }
}
```

### 3. Check Job Status

```typescript
async getJobStatus(jobId: string) {
  const job = await this.aiQueue.getJob(jobId);
  
  if (!job) {
    throw new NotFoundException('Job not found');
  }

  const state = await job.getState();
  const progress = job.progress();
  const result = job.returnvalue;
  const failedReason = job.failedReason;

  return {
    id: job.id,
    state,           // 'waiting', 'active', 'completed', 'failed'
    progress,        // 0-100
    result,          // Job result (if completed)
    failedReason,    // Error message (if failed)
    attempts: job.attemptsMade,
  };
}
```

## Processing Jobs

### 1. Create Processor

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

@Processor('ai-tasks')
export class AiTaskProcessor {
  private readonly logger = new Logger(AiTaskProcessor.name);

  constructor(
    private openaiService: OpenAIService,
    private conversationService: ConversationService,
  ) {}

  @Process('generate-completion')
  async handleCompletion(job: Job) {
    this.logger.debug(`Processing job ${job.id}`);

    try {
      const { userId, conversationId, message } = job.data;

      // Update progress
      await job.progress(10);

      // Get conversation history
      const history = await this.conversationService.getConversationHistory(
        conversationId,
        userId,
      );

      await job.progress(30);

      // Generate AI response
      const response = await this.openaiService.generateCompletion(history);

      await job.progress(80);

      // Save to database
      await this.conversationService.addMessage(
        conversationId,
        'ASSISTANT',
        response.content,
      );

      await job.progress(100);

      this.logger.debug(`Job ${job.id} completed`);

      // Return result
      return {
        conversationId,
        content: response.content,
        tokens: response.tokens,
      };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      throw error;  // Will be retried based on job options
    }
  }
}
```

### 2. Register Processor

Add processor to module providers:

```typescript
@Module({
  providers: [
    AiTaskProcessor,  // Register processor
  ],
})
export class AiModule {}
```

## Job Options

### Basic Options

```typescript
await queue.add('job-name', data, {
  // Priority (lower = higher priority)
  priority: 1,  // 1-1000000

  // Delay before processing
  delay: 5000,  // 5 seconds

  // Retry attempts
  attempts: 3,

  // Remove job after completion/failure
  removeOnComplete: true,
  removeOnFail: false,

  // Job timeout
  timeout: 60000,  // 1 minute
});
```

### Retry Strategy

```typescript
await queue.add('job-name', data, {
  attempts: 5,
  backoff: {
    type: 'exponential',  // or 'fixed'
    delay: 5000,          // Initial delay (ms)
  },
});
```

**Retry intervals:**
- Attempt 1: immediate
- Attempt 2: 5s delay
- Attempt 3: 10s delay
- Attempt 4: 20s delay
- Attempt 5: 40s delay

### Rate Limiting

```typescript
await queue.add('job-name', data, {
  limiter: {
    max: 10,       // Max 10 jobs
    duration: 1000, // per second
  },
});
```

### Job Expiration

```typescript
await queue.add('job-name', data, {
  // Remove if not processed within 1 hour
  lifespan: 3600000,
});
```

## Job Events

### Listen to Job Events

```typescript
@Injectable()
export class AiService {
  constructor(@InjectQueue('ai-tasks') private queue: Queue) {
    // Job completed
    this.queue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed:`, result);
    });

    // Job failed
    this.queue.on('failed', (job, error) => {
      console.error(`Job ${job.id} failed:`, error.message);
    });

    // Job progress
    this.queue.on('progress', (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
    });

    // Job stalled (worker died)
    this.queue.on('stalled', (job) => {
      console.warn(`Job ${job.id} stalled`);
    });

    // Queue drained (all jobs completed)
    this.queue.on('drained', () => {
      console.log('Queue is empty');
    });
  }
}
```

### Global Events

```typescript
this.queue.on('global:completed', (jobId, result) => {
  console.log(`Global: Job ${jobId} completed`);
});

this.queue.on('global:failed', (jobId, error) => {
  console.error(`Global: Job ${jobId} failed`);
});
```

## Scheduled Jobs (Cron)

### Repeatable Jobs

```typescript
// Add a job that runs every day at 3 AM
await queue.add(
  'daily-report',
  { date: new Date() },
  {
    repeat: {
      cron: '0 3 * * *',  // Cron expression
      tz: 'America/New_York',
    },
  }
);

// Every 5 minutes
await queue.add('cleanup', {}, {
  repeat: {
    cron: '*/5 * * * *',
  },
});

// Every hour
await queue.add('sync', {}, {
  repeat: {
    every: 3600000,  // milliseconds
  },
});
```

### Remove Repeatable Jobs

```typescript
// Get all repeatable jobs
const repeatableJobs = await queue.getRepeatableJobs();

// Remove specific job
await queue.removeRepeatableByKey(repeatableJobs[0].key);
```

## Queue Management

### Pause/Resume Queue

```typescript
// Pause queue (stop processing)
await queue.pause();

// Resume queue
await queue.resume();

// Check if paused
const isPaused = await queue.isPaused();
```

### Clear Queue

```typescript
// Remove all jobs
await queue.empty();

// Remove all completed jobs
await queue.clean(0, 'completed');

// Remove all failed jobs older than 1 day
await queue.clean(86400000, 'failed');
```

### Get Queue Stats

```typescript
const jobCounts = await queue.getJobCounts();
/*
{
  waiting: 5,
  active: 2,
  completed: 100,
  failed: 3,
  delayed: 1,
  paused: 0
}
*/

// Get specific jobs
const waitingJobs = await queue.getWaiting();
const activeJobs = await queue.getActive();
const completedJobs = await queue.getCompleted();
const failedJobs = await queue.getFailed();
```

## Bull Dashboard

### Installation

```bash
npm install @bull-board/api @bull-board/nestjs @bull-board/express
```

### Setup

```typescript
// src/app.module.ts
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullAdapter } from '@bull-board/api/bullAdapter';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'ai-tasks',
      adapter: BullAdapter,
    }),
  ],
})
export class AppModule {}
```

### Access Dashboard

Navigate to: `http://localhost:8000/admin/queues`

Features:
- View all queues
- Monitor job status
- Retry failed jobs
- Clean queues
- View job details

## API Endpoints

### Add Job Endpoint

```typescript
@Post('ai/queue')
@ApiOperation({ summary: 'Queue AI completion task' })
async queueAiTask(
  @CurrentUser('id') userId: string,
  @Body() dto: QueueAiTaskDto,
) {
  const job = await this.aiService.queueCompletion(
    userId,
    dto.conversationId,
    dto.message,
  );

  return {
    jobId: job.id,
    status: 'queued',
  };
}
```

### Check Job Status Endpoint

```typescript
@Get('ai/jobs/:jobId')
@ApiOperation({ summary: 'Get job status' })
async getJobStatus(@Param('jobId') jobId: string) {
  return this.aiService.getJobStatus(jobId);
}
```

### Cancel Job Endpoint

```typescript
@Delete('ai/jobs/:jobId')
@ApiOperation({ summary: 'Cancel job' })
async cancelJob(@Param('jobId') jobId: string) {
  const job = await this.aiQueue.getJob(jobId);
  
  if (!job) {
    throw new NotFoundException('Job not found');
  }

  await job.remove();
  
  return { message: 'Job cancelled' };
}
```

## Error Handling

### Retry Logic

```typescript
@Process('risky-task')
async handleRiskyTask(job: Job) {
  const { attemptsMade, opts } = job;

  try {
    // Attempt the task
    const result = await this.doSomethingRisky();
    return result;
  } catch (error) {
    // Log error
    this.logger.error(`Attempt ${attemptsMade} failed: ${error.message}`);

    // If last attempt, notify admin
    if (attemptsMade >= opts.attempts) {
      await this.notifyAdmin(job, error);
    }

    throw error;  // Will trigger retry
  }
}
```

### Failed Job Handler

```typescript
this.queue.on('failed', async (job, error) => {
  // Log to Sentry
  Sentry.captureException(error, {
    contexts: {
      job: {
        id: job.id,
        name: job.name,
        data: job.data,
        attempts: job.attemptsMade,
      },
    },
  });

  // Notify user if it's their job
  await this.notifyUser(job.data.userId, {
    message: 'Your job failed',
    jobId: job.id,
  });
});
```

## Best Practices

### 1. Idempotency

Make jobs idempotent (safe to retry):

```typescript
@Process('send-email')
async handleSendEmail(job: Job) {
  const { userId, emailType } = job.data;

  // Check if email already sent
  const alreadySent = await this.emailLog.exists(userId, emailType);
  if (alreadySent) {
    this.logger.warn(`Email already sent to ${userId}`);
    return { status: 'already_sent' };
  }

  // Send email
  await this.emailService.send(userId, emailType);

  // Mark as sent
  await this.emailLog.create(userId, emailType);

  return { status: 'sent' };
}
```

### 2. Progress Updates

Update job progress for long tasks:

```typescript
@Process('batch-process')
async handleBatch(job: Job) {
  const items = job.data.items;
  const total = items.length;

  for (let i = 0; i < total; i++) {
    await this.processItem(items[i]);
    
    // Update progress
    const progress = Math.floor(((i + 1) / total) * 100);
    await job.progress(progress);
  }
}
```

### 3. Logging

Log job lifecycle:

```typescript
@Process('important-task')
async handleTask(job: Job) {
  this.logger.log(`Starting job ${job.id}`);

  try {
    const result = await this.doWork(job.data);
    this.logger.log(`Job ${job.id} completed successfully`);
    return result;
  } catch (error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
    throw error;
  }
}
```

### 4. Data Validation

Validate job data:

```typescript
@Process('validate-task')
async handleTask(job: Job) {
  // Validate data
  const dto = plainToClass(TaskDto, job.data);
  const errors = await validate(dto);

  if (errors.length > 0) {
    throw new Error(`Invalid job data: ${JSON.stringify(errors)}`);
  }

  // Process valid data
  return this.doWork(dto);
}
```

## Testing

### Unit Tests

```typescript
describe('AiTaskProcessor', () => {
  let processor: AiTaskProcessor;
  let mockJob: Partial<Job>;

  beforeEach(() => {
    mockJob = {
      id: 'test-job-id',
      data: {
        userId: 'user-id',
        message: 'Test message',
      },
      progress: jest.fn(),
    };
  });

  it('should process job successfully', async () => {
    const result = await processor.handleCompletion(mockJob as Job);

    expect(result.content).toBeDefined();
    expect(mockJob.progress).toHaveBeenCalledWith(100);
  });
});
```

### Integration Tests

```typescript
describe('AI Queue Integration', () => {
  let queue: Queue;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        BullModule.registerQueue({ name: 'ai-tasks' }),
      ],
    }).compile();

    queue = module.get<Queue>(getQueueToken('ai-tasks'));
  });

  it('should add and process job', async () => {
    const job = await queue.add('generate-completion', {
      userId: 'test-user',
      message: 'Hello',
    });

    expect(job.id).toBeDefined();

    // Wait for completion
    await job.finished();

    const result = job.returnvalue;
    expect(result.content).toBeDefined();
  });
});
```

## Monitoring

### Metrics

Track important metrics:

```typescript
@Injectable()
export class QueueMetrics {
  private jobsProcessed = 0;
  private jobsFailed = 0;
  private totalProcessingTime = 0;

  constructor(@InjectQueue('ai-tasks') private queue: Queue) {
    this.queue.on('completed', (job) => {
      this.jobsProcessed++;
      const duration = Date.now() - job.timestamp;
      this.totalProcessingTime += duration;
    });

    this.queue.on('failed', () => {
      this.jobsFailed++;
    });
  }

  getMetrics() {
    return {
      processed: this.jobsProcessed,
      failed: this.jobsFailed,
      avgProcessingTime: this.totalProcessingTime / this.jobsProcessed,
    };
  }
}
```

## Troubleshooting

### Jobs Stuck in Active

If jobs are stuck in active state:

```typescript
// Clean stuck jobs
await queue.clean(5000, 'active');  // Clean jobs active > 5s
```

### Memory Issues

Limit job data size:

```typescript
// Remove completed jobs automatically
await queue.add('job', data, {
  removeOnComplete: true,
  removeOnFail: 50,  // Keep last 50 failed
});
```

### Redis Connection Issues

Check Redis connection:

```typescript
this.queue.client.on('error', (error) => {
  this.logger.error('Redis connection error:', error);
});

this.queue.client.on('connect', () => {
  this.logger.log('Connected to Redis');
});
```

## Next Steps

1. Add email queue for async email sending
2. Implement scheduled jobs for cleanup tasks
3. Add Bull Dashboard for queue monitoring
4. Implement job priorities
5. Add metrics and monitoring
6. Implement graceful shutdown
7. Add health checks for queue status

