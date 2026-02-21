# Backend Worker Project Template

## Introduction

This template provides comprehensive guidance for establishing backend worker projects with modern best practices and consistent patterns. Backend worker projects focus on building background job processing systems that handle asynchronous tasks, scheduled jobs, and long-running operations outside of the request-response cycle.

Use this template when:
- Processing background jobs triggered by API requests
- Running scheduled tasks and cron jobs
- Handling long-running data processing operations
- Processing messages from queues or event streams
- Performing batch operations and data migrations
- Sending emails, notifications, or other async communications

Key concerns for backend worker projects include reliability, fault tolerance, scalability, observability, and efficient resource utilization. This template addresses these concerns through structured recommendations for technology choices, architecture patterns, and development practices.

## Language & Technology Choices

### Recommended Languages

**Node.js (JavaScript/TypeScript)** (Recommended for I/O-heavy workers)

- Excellent for I/O-bound operations and concurrent job processing
- Large ecosystem with npm packages for job queues and scheduling
- JavaScript/TypeScript allows code sharing with API services
- Non-blocking event loop handles multiple jobs efficiently
- Strong community support for worker frameworks
- Trade-offs: Single-threaded (use worker threads or clustering for CPU-intensive tasks), memory management for long-running processes

**Python** (Recommended for data processing workers)
- Clean, readable syntax ideal for data transformation tasks
- Rich ecosystem for data processing, ML, and scientific computing
- Excellent libraries for ETL and batch processing
- Strong support for async operations with asyncio
- Great for workers that integrate with data science workflows
- Trade-offs: GIL limits true parallelism, slower than compiled languages for CPU-intensive tasks

**Go** (Recommended for high-throughput workers)
- Compiled language with excellent performance
- Built-in concurrency with goroutines perfect for parallel job processing
- Low memory footprint for running many workers
- Fast startup times for containerized workers
- Strong standard library with excellent concurrency primitives
- Trade-offs: Less flexible than dynamic languages, smaller ecosystem for specialized tasks

**Java** (Recommended for enterprise batch processing)
- Mature platform with battle-tested job processing frameworks
- Excellent performance with JVM optimizations
- Strong typing and compile-time error checking
- Enterprise-grade frameworks (Spring Batch, Quartz)
- Large talent pool and extensive documentation
- Trade-offs: Verbose syntax, higher memory footprint, slower startup times

### Technology Stack

**Core Technologies:**
- Job queue system (see Framework Recommendations)
- Database client libraries for job persistence
- Scheduling libraries for cron-like functionality
- Logging and monitoring tools
- Package manager: npm/yarn (Node.js), pip/poetry (Python), go modules (Go), Maven/Gradle (Java)

**Supporting Tools:**
- Message brokers: Redis, RabbitMQ, Apache Kafka, AWS SQS
- Job monitoring: Bull Board, Celery Flower, custom dashboards
- Testing frameworks: Jest/Vitest (Node.js), pytest (Python), testing package (Go), JUnit (Java)
- Linting: ESLint (Node.js), pylint/ruff (Python), golangci-lint (Go), Checkstyle (Java)

## Framework Recommendations

### Primary Frameworks

**BullMQ** (Node.js - Modern and Reliable)
- Redis-based job queue with excellent reliability features
- Built-in support for job priorities, delays, and repeatable jobs
- Automatic retry with exponential backoff
- Job events and progress tracking
- Rate limiting and concurrency control
- Bull Board for web-based monitoring
- TypeScript support with strong typing
- Trade-offs: Requires Redis, learning curve for advanced features

**Celery** (Python - Battle-Tested)
- Distributed task queue with massive ecosystem
- Support for multiple message brokers (RabbitMQ, Redis, SQS)
- Flexible task routing and workflows
- Built-in periodic task scheduling (Celery Beat)
- Flower for monitoring and administration
- Canvas for complex workflows (chains, groups, chords)
- Trade-offs: Complex configuration, can be heavyweight for simple use cases

**Temporal** (Multi-Language - Workflow Engine)
- Durable workflow execution engine
- Handles long-running workflows with reliability
- Built-in retry, timeout, and compensation logic
- Workflow versioning and migration support
- Excellent for complex multi-step processes
- SDKs for Go, Java, TypeScript, Python, PHP
- Trade-offs: Additional infrastructure (Temporal server), steeper learning curve, overkill for simple jobs

**Sidekiq** (Ruby - High Performance)
- Redis-based background job processing
- Excellent performance with multi-threading
- Simple API and easy to use
- Built-in web UI for monitoring
- Scheduled jobs and cron-like functionality
- Enterprise version with additional features
- Trade-offs: Ruby-specific, requires Redis

**Hangfire** (C#/.NET - .NET Ecosystem)
- Background job processing for .NET applications
- Persistent storage with multiple backends (SQL Server, Redis, PostgreSQL)
- Built-in dashboard for monitoring
- Recurring jobs with cron expressions
- Automatic retries and failure handling
- Trade-offs: .NET-specific, less flexible than some alternatives

**Apache Airflow** (Python - Complex Workflows)
- Platform for programmatically authoring, scheduling, and monitoring workflows
- DAG-based workflow definition
- Rich UI for workflow visualization
- Extensive operator library for integrations
- Scalable and distributed execution
- Trade-offs: Heavy infrastructure, complex setup, overkill for simple background jobs

### Supporting Libraries

**Job Scheduling:**
- node-cron (Node.js) - cron-like job scheduling
- node-schedule (Node.js) - flexible job scheduling
- APScheduler (Python) - advanced Python scheduler
- Quartz (Java) - enterprise job scheduling
- cron (Go) - cron expression parser

**Message Brokers:**
- Redis - fast in-memory data store
- RabbitMQ - robust message broker with AMQP
- Apache Kafka - distributed event streaming
- AWS SQS - managed message queue service
- Google Cloud Pub/Sub - managed messaging service

**Monitoring:**
- Bull Board (BullMQ) - web UI for job monitoring
- Flower (Celery) - real-time monitoring
- Temporal Web UI - workflow visualization
- Custom Prometheus metrics - for any framework

## Architecture Patterns

### Job Processing Patterns

**Simple Queue Worker:**
- Jobs added to queue by API or scheduler
- Workers pull jobs from queue and process
- Failed jobs moved to dead letter queue
- Simple and effective for most use cases

**Example Structure:**
```plaintext
src/
├── jobs/              # Job definitions
│   ├── email.job.ts
│   ├── report.job.ts
│   └── cleanup.job.ts
├── workers/           # Worker processes
│   └── main.worker.ts
├── queues/            # Queue configuration
│   └── queue.config.ts
├── processors/        # Job processors
│   ├── email.processor.ts
│   └── report.processor.ts
└── utils/             # Shared utilities
    └── logger.ts
```

**Priority Queue Pattern:**
- Multiple priority levels (high, normal, low)
- High-priority jobs processed first
- Prevents low-priority jobs from blocking critical tasks
- Useful for mixed workload types

**Workflow Pattern:**
- Complex multi-step processes
- Jobs depend on completion of previous jobs
- Support for parallel execution and fan-out/fan-in
- Error handling and compensation logic
- Use Temporal or custom workflow engine

**Scheduled Job Pattern:**
- Jobs run on fixed schedule (cron-like)
- Periodic tasks (daily reports, cleanup, sync)
- Ensure jobs don't overlap (use locking)
- Handle missed executions appropriately

**Event-Driven Pattern:**
- Workers consume events from message broker
- Process events and potentially emit new events
- Decoupled from event producers
- Scalable and flexible architecture

### Worker Pool Architecture

**Single Worker Type:**
- One worker process type handles all job types
- Simple deployment and management
- Jobs differentiated by type/name
- Good for small to medium workloads

**Specialized Workers:**
- Different worker types for different job categories
- CPU-intensive workers on compute-optimized instances
- I/O-intensive workers on network-optimized instances
- Memory-intensive workers on memory-optimized instances
- Better resource utilization and isolation

**Horizontal Scaling:**
- Multiple worker instances processing same queue
- Scale workers based on queue depth
- Auto-scaling based on metrics
- Load balancing handled by queue system

**Concurrency Models:**
- Process-based: Multiple worker processes
- Thread-based: Multiple threads per process (Python, Java)
- Async-based: Event loop with async/await (Node.js, Python asyncio)
- Goroutine-based: Lightweight concurrency (Go)

### Reliability Patterns

**At-Least-Once Processing:**
- Job guaranteed to be processed at least once
- May be processed multiple times on failure
- Requires idempotent job handlers
- Most common pattern for reliability

**Exactly-Once Processing:**
- Job processed exactly once, no duplicates
- Requires distributed transactions or deduplication
- More complex to implement
- Necessary for financial transactions

**Dead Letter Queue:**
- Failed jobs moved to separate queue after max retries
- Manual inspection and reprocessing
- Prevents poison messages from blocking queue
- Essential for production systems

**Circuit Breaker:**
- Detect failing external services
- Stop attempting requests after threshold
- Periodically retry to check if service recovered
- Prevents cascading failures

## Best Practices

### Reliability and Fault Tolerance Principles

**Idempotency:**
- Design jobs to be safely retried
- Same input produces same result
- Use unique job IDs to detect duplicates
- Critical for at-least-once processing

**Retry Strategy:**
- Implement exponential backoff for retries
- Set maximum retry attempts
- Different retry strategies for different error types
- Log retry attempts for debugging

**Timeout Handling:**
- Set appropriate timeouts for all operations
- Handle timeout errors gracefully
- Consider job complexity when setting timeouts
- Prevent jobs from running indefinitely

**Error Handling:**
- Catch and log all errors
- Distinguish between retryable and non-retryable errors
- Move permanently failed jobs to dead letter queue
- Alert on high error rates

**Job Atomicity:**
- Jobs should be self-contained units of work
- Avoid dependencies between jobs when possible
- Use transactions for database operations
- Implement compensation logic for failures

### Performance Considerations

**Concurrency Control:**
- Set appropriate concurrency limits per worker
- Balance throughput with resource usage
- Consider downstream system capacity
- Monitor and adjust based on metrics

**Batch Processing:**
- Group similar operations for efficiency
- Reduce database round trips
- Balance batch size with memory usage
- Implement batch timeouts

**Resource Management:**
- Close database connections properly
- Release file handles and network connections
- Implement connection pooling
- Monitor memory usage for leaks

**Queue Management:**
- Monitor queue depth and age
- Set queue size limits to prevent memory issues
- Implement queue prioritization
- Archive or purge old completed jobs

### Monitoring and Observability

**Job Metrics:**
- Job completion rate and duration
- Job failure rate by type
- Queue depth and wait time
- Worker utilization and throughput
- Retry counts and patterns

**Logging:**
- Log job start, completion, and failure
- Include job ID, type, and parameters
- Log execution time and resource usage
- Use structured logging for analysis

**Alerting:**
- Alert on high failure rates
- Alert on queue depth thresholds
- Alert on job duration anomalies
- Alert on worker health issues

**Tracing:**
- Trace job execution across services
- Include correlation IDs from originating requests
- Track job dependencies and workflows
- Visualize job execution paths

### Common Pitfalls to Avoid

- Not making jobs idempotent
- Ignoring retry and timeout strategies
- Not monitoring queue depth and job metrics
- Tight coupling between jobs
- Not handling partial failures in batch jobs
- Insufficient error logging
- Not testing failure scenarios
- Hardcoding configuration values
- Not implementing dead letter queues
- Ignoring resource cleanup


## Code Style & Formatting

### Naming Conventions

**Job Names:**
- Use descriptive names that indicate purpose: `sendWelcomeEmail`, `generateMonthlyReport`, `cleanupExpiredSessions`
- Use verb-noun pattern: `processOrder`, `syncUserData`, `exportAnalytics`
- Be consistent across all job definitions
- Include context when needed: `user.welcome.email`, `report.monthly.sales`

**Functions and Variables:**
- camelCase for functions and variables: `processJob`, `retryCount`, `maxAttempts`
- Boolean variables with prefixes: `isProcessing`, `hasCompleted`, `canRetry`
- Async functions: `async function processEmailJob()` or `processEmailJobAsync()`
- Event handlers: `onJobCompleted`, `onJobFailed`, `handleJobProgress`

**Classes and Types:**
- PascalCase for classes and types: `EmailProcessor`, `JobQueue`, `WorkerConfig`
- Descriptive names that indicate purpose: `ReportGenerator`, `DataSyncWorker`
- Interface prefix (optional): `IJobProcessor` or just `JobProcessor`

**Files and Modules:**
- kebab-case or camelCase depending on language convention
- Node.js/Python: `email-processor.ts`, `report-generator.py`
- Go: `email_processor.go`, `report_generator.go`
- Java: `EmailProcessor.java`, `ReportGenerator.java`
- Group related files by job type or functionality

**Constants and Environment Variables:**
- UPPER_SNAKE_CASE: `MAX_RETRY_ATTEMPTS`, `JOB_TIMEOUT_MS`, `QUEUE_NAME`, `REDIS_URL`
- Group related constants in configuration files
- Document expected environment variables

### File Organization

**By Job Type (Recommended):**
```plaintext
src/
├── jobs/
│   ├── email/
│   │   ├── welcome-email.job.ts
│   │   ├── notification-email.job.ts
│   │   └── email.processor.ts
│   ├── reports/
│   │   ├── daily-report.job.ts
│   │   ├── monthly-report.job.ts
│   │   └── report.processor.ts
│   └── cleanup/
│       ├── session-cleanup.job.ts
│       └── cleanup.processor.ts
├── workers/
│   ├── email.worker.ts
│   ├── report.worker.ts
│   └── cleanup.worker.ts
├── queues/
│   └── queue.config.ts
├── shared/
│   ├── utils/
│   └── services/
└── config/
    └── worker.config.ts
```

**By Layer (Alternative):**
```plaintext
src/
├── processors/
│   ├── email.processor.ts
│   ├── report.processor.ts
│   └── cleanup.processor.ts
├── jobs/
│   ├── email.jobs.ts
│   ├── report.jobs.ts
│   └── cleanup.jobs.ts
├── workers/
│   └── main.worker.ts
├── queues/
│   └── queue.ts
└── utils/
    └── logger.ts
```

### Formatting Rules

**Use a formatter:**
- Prettier (JavaScript/TypeScript) for consistent formatting
- Black (Python) - opinionated formatter
- gofmt (Go) - standard Go formatter
- google-java-format (Java)

**Linting:**
- ESLint (JavaScript/TypeScript) with recommended configs
- pylint or ruff (Python)
- golangci-lint (Go)
- Checkstyle or SpotBugs (Java)

**Code Style:**
- Consistent indentation (2 or 4 spaces)
- Max line length: 80-120 characters
- Trailing commas in multi-line structures
- Consistent quote style (single or double)
- Blank lines between logical sections

### Documentation Standards

**Job Documentation:**
- Document job purpose and trigger conditions
- Document expected input parameters
- Document side effects and dependencies
- Document retry behavior and error handling
- Include examples of job invocation

**Code Comments:**
- Document complex business logic
- Explain retry strategies and timeout values
- Document external service dependencies
- Explain "why" not "what"
- Keep comments up to date

**README Documentation:**
- Project overview and architecture
- Setup and installation instructions
- Environment variables and configuration
- Job types and their purposes
- Development workflow
- Deployment instructions
- Monitoring and troubleshooting guide

## Testing Approaches

### Testing Strategy

Implement a comprehensive testing approach:
- Many unit tests for job processors and business logic
- Integration tests for queue operations and job execution
- End-to-end tests for complete job workflows
- Chaos testing for failure scenarios

Focus on testing reliability, idempotency, and error handling.

### Unit Testing

**Job Processor Testing:**
- Test job logic in isolation
- Mock external dependencies (database, APIs, queues)
- Test success cases and error conditions
- Test retry logic and timeout handling
- Verify idempotency

**Recommended Tools:**
- Jest or Vitest (Node.js)
- pytest (Python)
- testing package (Go)
- JUnit 5 (Java)

**Example Approach:**
```typescript
describe('EmailProcessor', () => {
  it('should send welcome email successfully', async () => {
    const emailService = mockEmailService();
    const processor = new EmailProcessor(emailService);
    
    const result = await processor.processWelcomeEmail({
      userId: '123',
      email: 'user@example.com',
      name: 'Test User'
    });
    
    expect(result.success).toBe(true);
    expect(emailService.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Welcome!',
      template: 'welcome'
    });
  });
  
  it('should be idempotent when called multiple times', async () => {
    const emailService = mockEmailService();
    const processor = new EmailProcessor(emailService);
    
    const jobData = {
      jobId: 'unique-123',
      userId: '123',
      email: 'user@example.com'
    };
    
    await processor.processWelcomeEmail(jobData);
    await processor.processWelcomeEmail(jobData);
    
    // Should only send once due to deduplication
    expect(emailService.send).toHaveBeenCalledTimes(1);
  });
  
  it('should handle email service failure with retry', async () => {
    const emailService = mockEmailService();
    emailService.send.mockRejectedValueOnce(new Error('Service unavailable'));
    
    const processor = new EmailProcessor(emailService);
    
    await expect(
      processor.processWelcomeEmail({
        userId: '123',
        email: 'user@example.com'
      })
    ).rejects.toThrow('Service unavailable');
  });
});
```

### Integration Testing

**Queue Integration Testing:**
- Test job enqueueing and processing
- Test with real queue system (use test instance)
- Test job completion and failure handling
- Test retry mechanisms
- Test dead letter queue behavior

**Database Integration:**
- Test job state persistence
- Test with real database (use test database)
- Test transaction handling
- Test concurrent job processing

**Recommended Tools:**
- TestContainers - Docker containers for testing
- In-memory Redis for queue testing
- pytest with fixtures (Python)
- Testify (Go)
- Spring Test (Java)

**Example Approach:**
```typescript
describe('Email Job Integration', () => {
  let queue: Queue;
  let worker: Worker;
  
  beforeAll(async () => {
    // Setup test Redis and queue
    queue = new Queue('test-email', {
      connection: testRedisConfig
    });
    
    worker = new Worker('test-email', emailProcessor, {
      connection: testRedisConfig
    });
  });
  
  afterAll(async () => {
    await queue.close();
    await worker.close();
  });
  
  it('should process email job successfully', async () => {
    const job = await queue.add('welcome-email', {
      userId: '123',
      email: 'test@example.com'
    });
    
    // Wait for job completion
    await job.waitUntilFinished(queueEvents);
    
    const jobState = await job.getState();
    expect(jobState).toBe('completed');
  });
  
  it('should retry failed job with exponential backoff', async () => {
    const job = await queue.add('welcome-email', {
      userId: '123',
      email: 'invalid@example.com'
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
    
    await job.waitUntilFinished(queueEvents);
    
    const attempts = await job.getAttempts();
    expect(attempts).toBe(3);
  });
});
```

### Chaos Testing

**Failure Scenario Testing:**
- Test behavior when external services fail
- Test behavior when database is unavailable
- Test behavior when queue is full
- Test behavior under high load
- Test worker crash and recovery

**Recommended Approach:**
- Use fault injection to simulate failures
- Test with network delays and timeouts
- Test with resource constraints
- Verify graceful degradation
- Verify proper error logging and alerting

### Performance Testing

**Load Testing:**
- Test worker throughput under load
- Test queue performance with many jobs
- Identify bottlenecks and limits
- Test resource usage (CPU, memory, connections)
- Test scaling behavior

**Tools:**
- Custom scripts to enqueue many jobs
- Monitor queue depth and processing rate
- Profile worker processes
- Load test external dependencies

### Test Coverage Expectations

- Aim for 80%+ code coverage for job processors
- 100% coverage of critical paths (payments, notifications)
- Test all error handling paths
- Test idempotency for all jobs
- Test retry logic thoroughly
- Focus on meaningful tests over coverage metrics

## Deployment Considerations

### Build Process

**Production Build:**
- Compile TypeScript to JavaScript
- Bundle and optimize code
- Remove development dependencies
- Set production environment variables
- Validate configuration on startup

**Environment Configuration:**
- Use environment variables for all configuration
- Separate configs for dev, staging, production
- Never commit secrets or credentials
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- Validate required environment variables on startup
- Document all configuration options

### Deployment Strategies

**Containerization:**
- Docker for consistent environments
- Multi-stage builds for smaller images
- Use official base images
- Implement health checks in Dockerfile
- Scan images for vulnerabilities
- Optimize for fast startup times

**Example Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/worker.js"]
```

**Orchestration:**
- Kubernetes for container orchestration
- Horizontal Pod Autoscaler for scaling based on queue depth
- Job/CronJob resources for scheduled tasks
- ConfigMaps and Secrets for configuration
- Service mesh for advanced networking

**Platform-as-a-Service:**
- AWS ECS - container orchestration
- Google Cloud Run - serverless containers
- Azure Container Instances
- Heroku Workers - simple worker deployment
- Railway - modern deployment platform

**Serverless:**
- AWS Lambda - triggered by SQS, EventBridge
- Google Cloud Functions - triggered by Pub/Sub
- Azure Functions - triggered by queues
- Cloudflare Workers - edge computing
- Consider cold start times for time-sensitive jobs

### Scaling Strategies

**Horizontal Scaling:**
- Scale worker instances based on queue depth
- Use auto-scaling groups or Kubernetes HPA
- Set minimum and maximum worker counts
- Consider cost vs. processing speed trade-offs

**Vertical Scaling:**
- Increase worker resources for CPU/memory-intensive jobs
- Use appropriate instance types for workload
- Monitor resource utilization
- Balance cost with performance

**Queue-Based Scaling:**
- Scale based on queue depth metrics
- Scale based on job age in queue
- Different scaling policies for different job types
- Implement scale-down delays to prevent thrashing

**Example Kubernetes HPA:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: email-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: email-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: External
    external:
      metric:
        name: queue_depth
        selector:
          matchLabels:
            queue_name: email
      target:
        type: AverageValue
        averageValue: "30"
```

### CI/CD Patterns

**Continuous Integration:**
- Run tests on every commit
- Lint and format checks
- Security scanning (dependencies, code)
- Build verification
- Integration tests with test queue

**Continuous Deployment:**
- Deploy to staging on merge to main
- Deploy to production on release tags
- Automated rollback on failures
- Blue-green deployments for zero downtime
- Canary deployments for gradual rollout

**Worker-Specific Considerations:**
- Graceful shutdown of workers before deployment
- Drain queues or wait for job completion
- Deploy during low-traffic periods when possible
- Monitor job failure rates after deployment
- Keep old version running until new version stable

**Recommended Tools:**
- GitHub Actions - integrated with GitHub
- GitLab CI - integrated with GitLab
- CircleCI - powerful and flexible
- Jenkins - self-hosted option
- AWS CodePipeline - AWS-native CI/CD

### Monitoring and Observability

**Job Metrics:**
- Job completion rate and duration by type
- Job failure rate and error types
- Queue depth and wait time
- Worker utilization and throughput
- Retry counts and patterns
- Dead letter queue size

**Worker Metrics:**
- Worker count and health status
- CPU and memory usage per worker
- Active job count per worker
- Worker uptime and restart count
- Connection pool usage

**Queue Metrics:**
- Queue depth over time
- Job age in queue
- Enqueue and dequeue rates
- Queue processing latency
- Backlog size

**Logging:**
- Structured logging (JSON format)
- Log levels (debug, info, warn, error)
- Job ID and correlation IDs for tracing
- Centralized log aggregation
- Log retention policies

**Tools:**
- Prometheus + Grafana - metrics and dashboards
- Bull Board - BullMQ monitoring UI
- Flower - Celery monitoring
- Temporal Web UI - workflow visualization
- ELK Stack - logging and analysis
- Datadog - all-in-one observability
- Sentry - error tracking

### Health Checks and Graceful Shutdown

**Health Check Endpoints:**
- `/health` - basic liveness check
- `/health/ready` - readiness check (queue connection, dependencies)
- Return 200 for healthy, 503 for unhealthy
- Include queue connection status

**Graceful Shutdown:**
- Handle SIGTERM signal
- Stop accepting new jobs
- Complete in-flight jobs (with timeout)
- Close queue connections
- Close database connections
- Timeout after grace period (e.g., 30 seconds)

**Example Implementation:**
```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');
  
  // Stop accepting new jobs
  await worker.pause();
  
  // Wait for active jobs to complete (max 30 seconds)
  const timeout = setTimeout(() => {
    console.log('Shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000);
  
  // Wait for active jobs
  await worker.close();
  
  clearTimeout(timeout);
  console.log('Graceful shutdown complete');
  process.exit(0);
});
```

### Rollback Procedures

**Version Control:**
- Tag releases with semantic versioning
- Maintain release branches
- Document changes in CHANGELOG
- Keep deployment artifacts

**Rollback Strategy:**
- Automated rollback on critical errors
- Monitor job failure rates after deployment
- Quick rollback for breaking changes
- Communication plan for incidents
- Test rollback procedures regularly

**Job Compatibility:**
- Ensure backward compatibility for job data
- Version job schemas when making breaking changes
- Handle old job formats in new code
- Drain old jobs before removing support

## Queue Management & Job Scheduling

### Queue Configuration

**Queue Types:**
- Standard queues for general jobs
- Priority queues for urgent jobs
- Delayed queues for scheduled jobs
- Dead letter queues for failed jobs
- Separate queues for different job types

**Queue Settings:**
- Set appropriate visibility timeout
- Configure message retention period
- Set maximum message size
- Configure dead letter queue threshold
- Enable queue metrics and monitoring

**Example Configuration:**
```typescript
const emailQueue = new Queue('email', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 604800 // 7 days
    }
  }
});
```

### Job Scheduling Patterns

**Immediate Jobs:**
- Enqueued and processed as soon as possible
- Used for user-triggered actions
- Example: send welcome email after signup

**Delayed Jobs:**
- Enqueued with delay before processing
- Used for time-based actions
- Example: send reminder email 24 hours later

**Recurring Jobs:**
- Scheduled with cron expressions
- Run on fixed schedule
- Example: generate daily reports at midnight
- Ensure jobs don't overlap (use locking)

**Example Scheduling:**
```typescript
// Immediate job
await emailQueue.add('welcome', {
  userId: user.id,
  email: user.email
});

// Delayed job (1 hour)
await emailQueue.add('reminder', {
  userId: user.id
}, {
  delay: 3600000 // 1 hour in ms
});

// Recurring job (daily at midnight)
await emailQueue.add('daily-report', {
  reportType: 'sales'
}, {
  repeat: {
    cron: '0 0 * * *'
  }
});
```

### Job Prioritization

**Priority Levels:**
- Critical: immediate processing required
- High: process before normal jobs
- Normal: standard priority
- Low: process when resources available

**Implementation:**
```typescript
// High priority job
await queue.add('urgent-notification', data, {
  priority: 1 // Lower number = higher priority
});

// Normal priority job
await queue.add('standard-email', data, {
  priority: 5
});

// Low priority job
await queue.add('cleanup-task', data, {
  priority: 10
});
```

### Rate Limiting

**Concurrency Limiting:**
- Limit concurrent jobs per worker
- Limit concurrent jobs per queue
- Prevent overwhelming downstream services
- Balance throughput with resource usage

**Rate Limiting:**
- Limit jobs processed per time period
- Respect external API rate limits
- Implement token bucket or leaky bucket
- Queue jobs when rate limit reached

**Example:**
```typescript
const worker = new Worker('api-calls', processor, {
  connection: redisConfig,
  concurrency: 5, // Max 5 concurrent jobs
  limiter: {
    max: 100, // Max 100 jobs
    duration: 60000 // Per 60 seconds
  }
});
```

## Error Handling & Retry Logic

### Error Classification

**Retryable Errors:**
- Network timeouts
- Temporary service unavailability
- Rate limit errors
- Database connection errors
- Should trigger automatic retry

**Non-Retryable Errors:**
- Invalid input data
- Authentication failures
- Resource not found
- Business logic violations
- Should move to dead letter queue

**Example Error Handling:**
```typescript
class JobProcessor {
  async process(job: Job) {
    try {
      await this.executeJob(job.data);
    } catch (error) {
      if (this.isRetryable(error)) {
        throw error; // Will trigger retry
      } else {
        // Log and move to DLQ
        logger.error('Non-retryable error', {
          jobId: job.id,
          error: error.message
        });
        throw new NonRetryableError(error.message);
      }
    }
  }
  
  private isRetryable(error: Error): boolean {
    return error instanceof NetworkError ||
           error instanceof TimeoutError ||
           error instanceof ServiceUnavailableError;
  }
}
```

### Retry Strategies

**Exponential Backoff:**
- Increase delay between retries exponentially
- Prevents overwhelming failing services
- Standard approach for most scenarios
- Example: 1s, 2s, 4s, 8s, 16s

**Fixed Delay:**
- Same delay between all retries
- Simpler but less adaptive
- Use for predictable recovery times

**Custom Backoff:**
- Different strategies for different error types
- Adaptive based on error response
- More complex but more flexible

**Example Configuration:**
```typescript
await queue.add('api-call', data, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000 // Start with 1 second
  }
});

// Custom backoff
await queue.add('custom-job', data, {
  attempts: 3,
  backoff: {
    type: 'custom',
    strategy: (attemptsMade) => {
      // Custom logic based on attempts
      return attemptsMade * 2000;
    }
  }
});
```

### Dead Letter Queue Handling

**DLQ Purpose:**
- Store jobs that failed after max retries
- Prevent poison messages from blocking queue
- Allow manual inspection and reprocessing
- Essential for production reliability

**DLQ Monitoring:**
- Alert when DLQ size exceeds threshold
- Regular review of failed jobs
- Identify patterns in failures
- Fix root causes and reprocess

**Reprocessing Failed Jobs:**
- Manual review and correction
- Bulk reprocessing after fixes
- Selective reprocessing
- Archive permanently failed jobs

**Example DLQ Setup:**
```typescript
// Monitor DLQ
async function monitorDeadLetterQueue() {
  const dlqJobs = await queue.getFailed();
  
  if (dlqJobs.length > 100) {
    await alerting.send({
      severity: 'warning',
      message: `DLQ has ${dlqJobs.length} failed jobs`
    });
  }
  
  // Log failed job details
  for (const job of dlqJobs) {
    logger.warn('Job in DLQ', {
      jobId: job.id,
      jobName: job.name,
      failedReason: job.failedReason,
      attempts: job.attemptsMade
    });
  }
}

// Reprocess failed jobs
async function reprocessFailedJobs(jobIds: string[]) {
  for (const jobId of jobIds) {
    const job = await queue.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }
}
```

### Timeout Handling

**Job Timeouts:**
- Set maximum execution time for jobs
- Prevent jobs from running indefinitely
- Different timeouts for different job types
- Consider job complexity and external dependencies

**Implementation:**
```typescript
await queue.add('long-running-job', data, {
  timeout: 300000 // 5 minutes
});

// In processor
async function processJob(job: Job) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError()), job.opts.timeout);
  });
  
  const jobPromise = executeJobLogic(job.data);
  
  return Promise.race([jobPromise, timeoutPromise]);
}
```

## Monitoring & Observability Patterns

### Job Lifecycle Tracking

**Job Events:**
- Job enqueued
- Job started
- Job progress updates
- Job completed
- Job failed
- Job retried

**Event Logging:**
```typescript
worker.on('active', (job) => {
  logger.info('Job started', {
    jobId: job.id,
    jobName: job.name,
    attemptsMade: job.attemptsMade
  });
});

worker.on('completed', (job, result) => {
  logger.info('Job completed', {
    jobId: job.id,
    jobName: job.name,
    duration: Date.now() - job.processedOn,
    result: result
  });
});

worker.on('failed', (job, error) => {
  logger.error('Job failed', {
    jobId: job.id,
    jobName: job.name,
    error: error.message,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts
  });
});
```

### Metrics Collection

**Key Metrics:**
- Jobs processed per second
- Average job duration by type
- Job failure rate by type
- Queue depth over time
- Worker utilization
- Retry rate

**Prometheus Metrics Example:**
```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

const jobsProcessed = new Counter({
  name: 'jobs_processed_total',
  help: 'Total number of jobs processed',
  labelNames: ['job_name', 'status']
});

const jobDuration = new Histogram({
  name: 'job_duration_seconds',
  help: 'Job processing duration',
  labelNames: ['job_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue_name']
});

// Update metrics
worker.on('completed', (job) => {
  jobsProcessed.inc({ job_name: job.name, status: 'completed' });
  jobDuration.observe(
    { job_name: job.name },
    (Date.now() - job.processedOn) / 1000
  );
});
```

### Alerting Rules

**Critical Alerts:**
- Job failure rate > 10%
- Queue depth > 10,000 jobs
- No jobs processed in 5 minutes
- Worker crash or restart
- Dead letter queue growing rapidly

**Warning Alerts:**
- Job failure rate > 5%
- Queue depth > 5,000 jobs
- Average job duration increased 2x
- Worker memory usage > 80%

**Example Alert Configuration:**
```yaml
groups:
  - name: worker_alerts
    rules:
      - alert: HighJobFailureRate
        expr: rate(jobs_processed_total{status="failed"}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High job failure rate detected"
          description: "Job failure rate is {{ $value }} per second"
      
      - alert: QueueDepthHigh
        expr: queue_depth > 10000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue depth is high"
          description: "Queue {{ $labels.queue_name }} has {{ $value }} jobs"
```

### Distributed Tracing

**Trace Job Execution:**
- Trace from API request to job completion
- Track job dependencies and workflows
- Identify bottlenecks in processing
- Visualize job execution paths

**OpenTelemetry Example:**
```typescript
import { trace } from '@opentelemetry/api';

async function processJob(job: Job) {
  const tracer = trace.getTracer('worker');
  
  return tracer.startActiveSpan('process-job', async (span) => {
    span.setAttribute('job.id', job.id);
    span.setAttribute('job.name', job.name);
    span.setAttribute('job.attempts', job.attemptsMade);
    
    try {
      const result = await executeJobLogic(job.data);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Conclusion

This template provides a comprehensive foundation for backend worker projects. Adapt these recommendations to your specific project needs, workload characteristics, and infrastructure constraints. The key is to establish reliable patterns early and evolve them as your system scales.

Remember:
- Design jobs to be idempotent from the start
- Implement comprehensive retry and error handling
- Monitor queue depth and job metrics continuously
- Test failure scenarios thoroughly
- Implement graceful shutdown for deployments
- Use dead letter queues for failed jobs
- Scale workers based on queue depth
- Log structured data for analysis
- Alert on anomalies and failures
- Document job types and their behavior

For questions or suggestions about this template, consult with your team and adapt it to your organization's specific needs and constraints.
