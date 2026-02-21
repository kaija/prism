# Backend API Project Template

## Introduction

This template provides comprehensive guidance for establishing backend API projects with modern best practices and consistent patterns. Backend API projects focus on building server-side services that expose HTTP endpoints for client applications, mobile apps, or other services to consume.

Use this template when:
- Building RESTful APIs for web or mobile applications
- Creating GraphQL services for flexible data querying
- Developing gRPC services for high-performance inter-service communication
- Implementing microservices or service-oriented architectures

Key concerns for backend API projects include scalability, security, reliability, performance, and maintainability. This template addresses these concerns through structured recommendations for technology choices, architecture patterns, and development practices.

## Language & Technology Choices

### Recommended Languages

**Node.js (JavaScript/TypeScript)** (Recommended for I/O-heavy applications)

- Excellent for I/O-bound operations and real-time applications
- Large ecosystem with npm packages for almost everything
- JavaScript/TypeScript allows full-stack development with shared code
- Non-blocking event loop handles concurrent requests efficiently
- Strong community and extensive tooling
- Trade-offs: Single-threaded (use clustering for CPU-intensive tasks), callback complexity without async/await

**Python** (Recommended for data-intensive applications)
- Clean, readable syntax with excellent developer productivity
- Rich ecosystem for data processing, ML, and scientific computing
- Strong typing support with type hints and mypy
- Excellent for rapid prototyping and MVPs
- Great for APIs that integrate with data science workflows
- Trade-offs: Slower than compiled languages, GIL limits true parallelism

**Go** (Recommended for high-performance services)
- Compiled language with excellent performance
- Built-in concurrency with goroutines and channels
- Fast compilation and deployment
- Small binary sizes and low memory footprint
- Strong standard library with HTTP server built-in
- Trade-offs: Less flexible than dynamic languages, smaller ecosystem, verbose error handling

**Java** (Recommended for enterprise applications)
- Mature, battle-tested platform with strong ecosystem
- Excellent performance with JVM optimizations
- Strong typing and compile-time error checking
- Enterprise-grade frameworks and tools
- Large talent pool and extensive documentation
- Trade-offs: Verbose syntax, slower startup times, larger memory footprint

**Rust** (Recommended for systems-level performance)
- Memory safety without garbage collection
- Performance comparable to C/C++
- Excellent concurrency model with ownership system
- Growing ecosystem for web development
- Zero-cost abstractions
- Trade-offs: Steep learning curve, longer development time, smaller ecosystem

### Technology Stack

**Core Technologies:**
- HTTP server framework (see Framework Recommendations)
- Database client libraries
- Authentication/authorization libraries
- Logging and monitoring tools
- Package manager: npm/yarn (Node.js), pip/poetry (Python), go modules (Go), Maven/Gradle (Java), Cargo (Rust)

**Supporting Tools:**
- API documentation: OpenAPI/Swagger, GraphQL introspection
- Testing frameworks: Jest/Vitest (Node.js), pytest (Python), testing package (Go), JUnit (Java), cargo test (Rust)
- Linting: ESLint (Node.js), pylint/ruff (Python), golangci-lint (Go), Checkstyle (Java), clippy (Rust)

## Framework Recommendations

### Primary Frameworks

**Express.js** (Node.js - Most Popular)
- Minimal, unopinionated framework with large ecosystem
- Middleware-based architecture for composability
- Extensive third-party middleware available
- Easy to learn and get started
- Flexible routing and request handling
- Trade-offs: Requires manual setup for many features, callback-based (use with async/await)

**Fastify** (Node.js - Performance-Focused)
- High-performance framework with schema-based validation
- Built-in JSON schema validation
- Plugin architecture for extensibility
- Excellent TypeScript support
- Faster than Express with lower overhead
- Trade-offs: Smaller ecosystem than Express, different patterns to learn

**FastAPI** (Python - Modern and Fast)
- Automatic API documentation with OpenAPI
- Built-in data validation with Pydantic
- Async support for high performance
- Excellent type hints and editor support
- Automatic request/response serialization
- Trade-offs: Requires Python 3.7+, async patterns may be unfamiliar

**Flask** (Python - Lightweight and Flexible)
- Minimal framework with simple core
- Easy to learn and get started quickly
- Flexible and unopinionated
- Large ecosystem of extensions
- Good for small to medium APIs
- Trade-offs: Manual setup for many features, synchronous by default

**Gin** (Go - High Performance)
- Fast HTTP router with radix tree
- Middleware support for composability
- JSON validation and rendering
- Error management and recovery
- Excellent performance benchmarks
- Trade-offs: Less opinionated, requires more manual setup

**Spring Boot** (Java - Enterprise-Grade)
- Comprehensive framework with everything included
- Dependency injection and inversion of control
- Extensive ecosystem and integrations
- Production-ready features (metrics, health checks)
- Strong security features
- Trade-offs: Heavy framework, steep learning curve, verbose configuration

**Actix Web** (Rust - Blazing Fast)
- Actor-based framework with excellent performance
- Type-safe routing and handlers
- Async/await support
- Middleware and extractors for composability
- WebSocket support built-in
- Trade-offs: Rust learning curve, smaller ecosystem, longer compile times

### Supporting Libraries

**Database Access:**
- Prisma (Node.js) - type-safe ORM with migrations
- TypeORM (Node.js) - TypeScript ORM
- SQLAlchemy (Python) - powerful ORM
- GORM (Go) - developer-friendly ORM
- Hibernate (Java) - mature ORM
- Diesel (Rust) - safe, extensible ORM

**Authentication:**
- Passport.js (Node.js) - authentication middleware
- Auth0 SDK - managed authentication service
- JWT libraries - token-based authentication
- OAuth2 libraries - third-party authentication

**Validation:**
- Joi / Zod (Node.js) - schema validation
- Pydantic (Python) - data validation with type hints
- validator (Go) - struct validation
- Hibernate Validator (Java) - bean validation
- serde (Rust) - serialization with validation

**API Documentation:**
- Swagger/OpenAPI - REST API documentation
- GraphQL Playground - GraphQL API exploration
- Postman - API testing and documentation
- Redoc - OpenAPI documentation renderer

## Architecture Patterns

### Layered Architecture

**Presentation Layer (Controllers/Handlers):**
- Handle HTTP requests and responses
- Route requests to appropriate business logic
- Validate input and format output
- Handle authentication and authorization
- Keep thin - delegate to service layer

**Business Logic Layer (Services):**
- Implement core business rules and workflows
- Coordinate between different domain entities
- Handle transactions and data consistency
- Independent of HTTP concerns
- Testable without HTTP infrastructure

**Data Access Layer (Repositories):**
- Abstract database operations
- Provide clean interface for data access
- Handle query construction and execution
- Map between domain models and database schemas
- Isolate database-specific code

**Example Structure:**
```plaintext
src/
├── controllers/     # HTTP handlers
├── services/        # Business logic
├── repositories/    # Data access
├── models/          # Domain models
├── middleware/      # HTTP middleware
└── utils/           # Shared utilities
```

### Clean Architecture

**Core Principles:**
- Dependency rule: dependencies point inward
- Inner layers don't know about outer layers
- Business logic independent of frameworks
- Testable without external dependencies

**Layers:**
- Entities: Core business objects
- Use Cases: Application-specific business rules
- Interface Adapters: Controllers, presenters, gateways
- Frameworks & Drivers: External tools and frameworks

**Benefits:**
- Highly testable and maintainable
- Framework-independent core logic
- Easy to swap implementations
- Clear separation of concerns

### Hexagonal Architecture (Ports and Adapters)

**Core Domain:**
- Business logic and domain models
- Defines ports (interfaces) for external interactions
- Independent of external systems

**Adapters:**
- Primary adapters: HTTP controllers, CLI, message consumers
- Secondary adapters: Database, external APIs, message queues
- Implement ports defined by core domain

**Benefits:**
- Flexible and adaptable to change
- Easy to test with mock adapters
- Clear boundaries between domain and infrastructure
- Supports multiple interfaces (HTTP, CLI, events)

### Microservices Patterns

**Service Decomposition:**
- Decompose by business capability
- Decompose by subdomain (DDD)
- Self-contained services with own database
- Communicate via APIs or message queues

**API Gateway Pattern:**
- Single entry point for clients
- Routes requests to appropriate services
- Handles cross-cutting concerns (auth, rate limiting)
- Aggregates responses from multiple services

**Service Discovery:**
- Dynamic service registration
- Health checks and load balancing
- Service mesh for advanced networking

## Best Practices

### API Design Principles

**RESTful Design:**
- Use HTTP methods correctly (GET, POST, PUT, PATCH, DELETE)
- Resource-based URLs (/users, /users/:id)
- Use plural nouns for collections
- Nest resources appropriately (/users/:id/posts)
- Return appropriate status codes (200, 201, 400, 404, 500)
- Use HATEOAS for discoverability (optional)

**GraphQL Design:**
- Design schema around client needs
- Use types and interfaces effectively
- Implement pagination for lists
- Handle N+1 queries with DataLoader
- Provide clear error messages

**Versioning:**
- Version your API from the start
- Use URL versioning (/v1/users) or header versioning
- Maintain backward compatibility when possible
- Deprecate old versions gracefully
- Document breaking changes clearly

**Pagination:**
- Implement pagination for list endpoints
- Use cursor-based pagination for large datasets
- Provide total count when feasible
- Include next/previous links in response

**Filtering and Sorting:**
- Support query parameters for filtering
- Allow sorting by multiple fields
- Validate filter and sort parameters
- Document available filters and sort options

### Security Best Practices

**Authentication:**
- Use strong authentication mechanisms (OAuth2, JWT)
- Implement token expiration and refresh
- Store passwords with strong hashing (bcrypt, Argon2)
- Use HTTPS for all endpoints
- Implement rate limiting on auth endpoints

**Authorization:**
- Implement role-based access control (RBAC)
- Validate permissions on every request
- Use principle of least privilege
- Audit access to sensitive resources

**Input Validation:**
- Validate all input data
- Use schema validation libraries
- Sanitize input to prevent injection attacks
- Validate content types and file uploads
- Set request size limits

**Security Headers:**
- Set appropriate CORS headers
- Use Content Security Policy (CSP)
- Implement HSTS for HTTPS enforcement
- Set X-Content-Type-Options: nosniff
- Use X-Frame-Options to prevent clickjacking

### Performance Considerations

**High QPS Optimization:**
- Use async/non-blocking I/O for all operations
- Implement connection pooling for databases and external services
- Use caching aggressively (Redis, in-memory)
- Optimize database queries and add proper indexes
- Use load balancing across multiple instances
- Implement rate limiting to protect resources
- Use CDN for static assets
- Enable HTTP/2 or HTTP/3 for multiplexing
- Compress responses (gzip, brotli)
- Use efficient serialization (Protocol Buffers, MessagePack)

**Caching:**
- Implement multi-level caching (L1: in-memory, L2: Redis)
- Cache frequently accessed data
- Use Redis or Memcached for distributed caching
- Set appropriate cache TTLs
- Implement cache invalidation strategies
- Use ETags for conditional requests
- Cache at CDN level for static content

**Database Optimization:**
- Use connection pooling (configure min/max connections)
- Implement proper indexing on frequently queried columns
- Optimize queries (avoid N+1 problems, use joins efficiently)
- Use read replicas for read-heavy workloads
- Consider database sharding for horizontal scale
- Use database query caching
- Implement pagination for large result sets
- Use EXPLAIN to analyze query performance

**Connection Pool Configuration:**

**Node.js (Prisma) Example:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  log: ['query', 'error', 'warn'],
});

// Configure pool in DATABASE_URL
// postgresql://user:password@localhost:5432/db?connection_limit=20&pool_timeout=10
```

**Python (SQLAlchemy) Example:**
```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,          # Number of connections to maintain
    max_overflow=20,       # Max connections beyond pool_size
    pool_timeout=30,       # Timeout for getting connection
    pool_recycle=3600,     # Recycle connections after 1 hour
    pool_pre_ping=True,    # Verify connections before using
)
```

**Go (pgx) Example:**
```go
import (
    "github.com/jackc/pgx/v5/pgxpool"
)

config, _ := pgxpool.ParseConfig(databaseURL)
config.MaxConns = 20                    // Maximum connections
config.MinConns = 5                     // Minimum connections
config.MaxConnLifetime = time.Hour      // Max connection lifetime
config.MaxConnIdleTime = 30 * time.Minute
config.HealthCheckPeriod = time.Minute

pool, _ := pgxpool.NewWithConfig(context.Background(), config)
```

**Async Processing:**
- Use background jobs for long-running tasks
- Implement job queues (Redis, RabbitMQ, SQS)
- Return 202 Accepted for async operations
- Provide status endpoints for job tracking
- Use worker pools for parallel processing

**Load Balancing:**
- Use reverse proxy (Nginx, HAProxy, Envoy)
- Implement health checks for backend instances
- Use round-robin, least connections, or IP hash algorithms
- Enable session affinity if needed (sticky sessions)
- Configure proper timeouts and retries

**Rate Limiting:**
- Implement per-user and per-IP rate limits
- Use token bucket or sliding window algorithms
- Return 429 Too Many Requests with Retry-After header
- Use Redis for distributed rate limiting
- Implement different limits for different endpoints

**Rate Limiting Example (Node.js):**
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const limiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
    });
  },
});

app.use('/api/', limiter);
```

### Common Pitfalls to Avoid

- Exposing internal implementation details in API
- Not handling errors consistently
- Ignoring security from the start
- Over-fetching or under-fetching data
- Not implementing proper logging
- Tight coupling between layers
- Not considering backward compatibility
- Ignoring API documentation
- Not implementing health checks
- Hardcoding configuration values


## Code Style & Formatting

### Naming Conventions

**API Endpoints:**
- Use kebab-case for URLs: `/api/user-profiles`, `/api/order-items`
- Use plural nouns for collections: `/users`, `/products`
- Use singular for single resource operations: `/users/:id`
- Be consistent across all endpoints

**Functions and Variables:**
- camelCase for functions and variables: `getUserById`, `isAuthenticated`
- Boolean variables with prefixes: `isValid`, `hasPermission`, `canAccess`
- Async functions: `async function fetchUserData()` or `getUserDataAsync()`
- Event handlers: `handleRequest`, `onUserCreated`, `processPayment`

**Classes and Types:**
- PascalCase for classes and types: `UserService`, `OrderRepository`, `ApiResponse`
- Interface prefix (optional): `IUserService` or just `UserService`
- Descriptive names that indicate purpose

**Files and Modules:**
- kebab-case or camelCase depending on language convention
- Node.js/Python: `user-service.ts`, `order-repository.py`
- Go: `user_service.go`, `order_repository.go`
- Java: `UserService.java`, `OrderRepository.java`
- Group related files in directories by feature or layer

**Constants and Environment Variables:**
- UPPER_SNAKE_CASE: `API_BASE_URL`, `MAX_RETRY_ATTEMPTS`, `DATABASE_URL`
- Group related constants in configuration files

### File Organization

**By Layer (Traditional):**
```plaintext
src/
├── controllers/
│   ├── user.controller.ts
│   └── order.controller.ts
├── services/
│   ├── user.service.ts
│   └── order.service.ts
├── repositories/
│   ├── user.repository.ts
│   └── order.repository.ts
├── models/
│   ├── user.model.ts
│   └── order.model.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── validation.middleware.ts
└── utils/
    └── logger.ts
```

**By Feature (Recommended for larger projects):**
```plaintext
src/
├── users/
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── user.repository.ts
│   ├── user.model.ts
│   └── user.test.ts
├── orders/
│   ├── order.controller.ts
│   ├── order.service.ts
│   ├── order.repository.ts
│   └── order.model.ts
├── shared/
│   ├── middleware/
│   └── utils/
└── config/
    └── database.ts
```

### Formatting Rules

**Use a formatter:**
- Prettier (JavaScript/TypeScript) for consistent formatting
- Black (Python) - opinionated formatter
- gofmt (Go) - standard Go formatter
- google-java-format (Java)
- rustfmt (Rust)

**Linting:**
- ESLint (JavaScript/TypeScript) with recommended configs
- pylint or ruff (Python)
- golangci-lint (Go)
- Checkstyle or SpotBugs (Java)
- clippy (Rust)

**Code Style:**
- Consistent indentation (2 or 4 spaces)
- Max line length: 80-120 characters
- Trailing commas in multi-line structures
- Consistent quote style (single or double)
- Blank lines between logical sections

### Documentation Standards

**API Documentation:**
- Use OpenAPI/Swagger for REST APIs
- Document all endpoints with descriptions
- Include request/response examples
- Document error responses
- Keep documentation in sync with code

**Code Comments:**
- Document public APIs and interfaces
- Explain complex business logic
- Document "why" not "what"
- Keep comments up to date
- Use JSDoc, docstrings, or language-specific formats

**README Documentation:**
- Project overview and purpose
- Setup and installation instructions
- Environment variables and configuration
- API endpoint overview
- Development workflow
- Deployment instructions

## Testing Approaches

### Testing Strategy

Implement a comprehensive testing pyramid:
- Many unit tests for business logic and utilities
- Moderate integration tests for API endpoints and database interactions
- Few end-to-end tests for critical user flows

Focus on testing behavior and contracts rather than implementation details.

### Unit Testing

**Business Logic Testing:**
- Test service layer functions in isolation
- Mock external dependencies (database, APIs)
- Test edge cases and error conditions
- Test validation logic
- Test data transformations

**Recommended Tools:**
- Jest or Vitest (Node.js)
- pytest (Python)
- testing package (Go)
- JUnit 5 (Java)
- cargo test (Rust)

**Example Approach:**
```typescript
describe('UserService', () => {
  it('should create user with hashed password', async () => {
    const userRepo = mockUserRepository();
    const userService = new UserService(userRepo);
    
    const user = await userService.createUser({
      email: 'test@example.com',
      password: 'password123'
    });
    
    expect(user.password).not.toBe('password123');
    expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash
  });
});
```

### Integration Testing

**API Endpoint Testing:**
- Test complete request/response cycle
- Test with real database (use test database)
- Test authentication and authorization
- Test error responses and status codes
- Test request validation

**Database Integration:**
- Test repository layer with real database
- Use transactions and rollback for isolation
- Test complex queries and joins
- Test database constraints

**Recommended Tools:**
- Supertest (Node.js) - HTTP assertion library
- TestContainers - Docker containers for testing
- pytest with fixtures (Python)
- httptest package (Go)
- Spring Test (Java)

**Example Approach:**
```typescript
describe('POST /api/users', () => {
  it('should create user and return 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })
      .expect(201);
    
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
    expect(response.body).not.toHaveProperty('password');
  });
  
  it('should return 400 for invalid email', async () => {
    await request(app)
      .post('/api/users')
      .send({
        email: 'invalid-email',
        password: 'password123'
      })
      .expect(400);
  });
});
```

### Contract Testing

**API Contract Testing:**
- Define contracts between services
- Test that API matches contract specification
- Use tools like Pact for consumer-driven contracts
- Validate OpenAPI specifications

**Benefits:**
- Catch breaking changes early
- Enable independent service development
- Document service interactions
- Support microservices architecture

### End-to-End Testing

**Critical Flows:**
- User registration and authentication
- Core business processes
- Payment and transaction flows
- Multi-step workflows

**Recommended Tools:**
- Playwright or Cypress (if testing through UI)
- Postman/Newman for API workflows
- Custom scripts for service-to-service flows

**Best Practices:**
- Keep E2E tests focused on happy paths
- Run in staging environment
- Use realistic test data
- Clean up test data after runs

### Performance Testing

**Load Testing:**
- Test API under expected load
- Identify bottlenecks and limits
- Test database query performance
- Monitor resource usage

**Tools:**
- k6 - modern load testing tool
- Apache JMeter - comprehensive testing
- Artillery - simple load testing
- Gatling - Scala-based load testing

### Test Coverage Expectations

- Aim for 80%+ code coverage for business logic
- 100% coverage of critical paths (auth, payments)
- Focus on meaningful tests over coverage metrics
- Test error handling and edge cases
- Don't sacrifice test quality for coverage numbers

## Deployment Considerations

### Build Process

**Production Build:**
- Compile TypeScript to JavaScript
- Bundle and optimize code
- Remove development dependencies
- Set production environment variables
- Generate API documentation

**Environment Configuration:**
- Use environment variables for configuration
- Separate configs for dev, staging, production
- Never commit secrets or API keys
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- Validate required environment variables on startup

## Configuration Management

### Configuration Strategy

**Configuration Hierarchy:**
1. **Defaults** - Hardcoded sensible defaults in code
2. **Config Files** - YAML/JSON/TOML files for environment-specific settings
3. **Environment Variables** - Override config file values
4. **Command-line Arguments** - Highest priority overrides

### Reading Configuration Files

**Node.js/TypeScript Example:**
```typescript
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { z } from 'zod';

// Define config schema with validation
const ConfigSchema = z.object({
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default('0.0.0.0'),
  }),
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    pool: z.object({
      min: z.number().default(2),
      max: z.number().default(10),
    }),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number().default(6379),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

type Config = z.infer<typeof ConfigSchema>;

class ConfigManager {
  private config: Config;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    // 1. Load from config file
    const configFile = process.env.CONFIG_FILE || 'config/default.yaml';
    const fileConfig = yaml.load(fs.readFileSync(configFile, 'utf8'));

    // 2. Merge with environment variables
    const envConfig = {
      server: {
        port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
        host: process.env.HOST,
      },
      database: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
        name: process.env.DB_NAME,
        pool: {
          min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN) : undefined,
          max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : undefined,
        },
      },
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined,
      },
      logging: {
        level: process.env.LOG_LEVEL,
      },
    };

    // 3. Deep merge configs (env vars override file config)
    const merged = this.deepMerge(fileConfig, envConfig);

    // 4. Validate and return
    return ConfigSchema.parse(merged);
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    for (const key in source) {
      if (source[key] !== undefined) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
          output[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          output[key] = source[key];
        }
      }
    }
    return output;
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  getAll(): Config {
    return this.config;
  }
}

// Singleton instance
export const config = new ConfigManager();
```

**Python Example:**
```python
import os
import yaml
from typing import Dict, Any
from pydantic import BaseSettings, Field, validator

class DatabaseConfig(BaseSettings):
    host: str
    port: int = 5432
    name: str
    user: str
    password: str
    pool_min: int = Field(2, alias='pool_min')
    pool_max: int = Field(10, alias='pool_max')

class ServerConfig(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4

class Config(BaseSettings):
    server: ServerConfig
    database: DatabaseConfig
    log_level: str = "info"
    
    class Config:
        env_file = '.env'
        env_nested_delimiter = '__'

def load_config(config_file: str = "config/default.yaml") -> Config:
    # Load from YAML file
    with open(config_file, 'r') as f:
        file_config = yaml.safe_load(f)
    
    # Environment variables override file config
    # Use double underscore for nested: DATABASE__HOST=localhost
    return Config(**file_config)

# Singleton
config = load_config()
```

**Go Example:**
```go
package config

import (
    "fmt"
    "os"
    "github.com/spf13/viper"
)

type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Redis    RedisConfig
    Logging  LoggingConfig
}

type ServerConfig struct {
    Port int
    Host string
}

type DatabaseConfig struct {
    Host     string
    Port     int
    Name     string
    User     string
    Password string
    Pool     PoolConfig
}

type PoolConfig struct {
    Min int
    Max int
}

type RedisConfig struct {
    Host string
    Port int
}

type LoggingConfig struct {
    Level string
}

func Load() (*Config, error) {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath("./config")
    viper.AddConfigPath(".")

    // Set defaults
    viper.SetDefault("server.port", 8080)
    viper.SetDefault("server.host", "0.0.0.0")
    viper.SetDefault("database.pool.min", 2)
    viper.SetDefault("database.pool.max", 10)

    // Read config file
    if err := viper.ReadInConfig(); err != nil {
        return nil, fmt.Errorf("failed to read config: %w", err)
    }

    // Environment variables override file config
    viper.AutomaticEnv()
    viper.SetEnvPrefix("APP")

    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, fmt.Errorf("failed to unmarshal config: %w", err)
    }

    return &config, nil
}
```

### Configuration File Examples

**config/default.yaml:**
```yaml
server:
  port: 3000
  host: 0.0.0.0

database:
  host: localhost
  port: 5432
  name: myapp_dev
  pool:
    min: 2
    max: 10

redis:
  host: localhost
  port: 6379

logging:
  level: info
```

**config/production.yaml:**
```yaml
server:
  port: 8080

database:
  host: db.production.example.com
  port: 5432
  name: myapp_prod
  pool:
    min: 10
    max: 50

redis:
  host: redis.production.example.com
  port: 6379

logging:
  level: warn
```

### Best Practices

**Type Safety:**
- Use schema validation (Zod, Pydantic, struct tags)
- Fail fast on invalid configuration
- Provide clear error messages for missing required values

**Security:**
- Never commit secrets to config files
- Use environment variables for sensitive data
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- Encrypt config files if they contain sensitive data

**Validation:**
- Validate all configuration on startup
- Check for required fields
- Validate value ranges and formats
- Fail fast with clear error messages

**Hot Reload (Optional):**
- Watch config files for changes
- Reload configuration without restart
- Use for non-critical settings only
- Implement graceful config updates

### Deployment Strategies

**Containerization:**
- Docker for consistent environments
- Multi-stage builds for smaller images
- Use official base images
- Implement health checks in Dockerfile
- Scan images for vulnerabilities

### Container Best Practices

**Multi-Stage Builds for Minimal Size:**

**Node.js/TypeScript Dockerfile:**
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Graceful shutdown handler
STOPSIGNAL SIGTERM

# Start application
CMD ["node", "dist/server.js"]
```

**Python Dockerfile:**
```dockerfile
# Stage 1: Build
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim AS production

# Create non-root user
RUN useradd -m -u 1001 appuser

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Add local bin to PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()"

# Graceful shutdown
STOPSIGNAL SIGTERM

# Start application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "30", "--graceful-timeout", "30", "app:app"]
```

**Go Dockerfile:**
```dockerfile
# Stage 1: Build
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o server .

# Stage 2: Production (minimal image)
FROM alpine:3.18 AS production

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder --chown=appuser:appuser /app/server .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Graceful shutdown
STOPSIGNAL SIGTERM

# Start application
CMD ["./server"]
```

### Container Optimization Techniques

**Layer Minimization:**
- Combine RUN commands with && to reduce layers
- Clean up package manager caches in same layer
- Use .dockerignore to exclude unnecessary files
- Copy only necessary files in production stage

**.dockerignore Example:**
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
dist
coverage
.vscode
.idea
*.test.js
*.spec.js
```

**Image Size Optimization:**
- Use alpine-based images (smaller base)
- Multi-stage builds (only copy production artifacts)
- Remove build dependencies in production stage
- Use --no-cache-dir for package managers
- Strip debug symbols from binaries (Go: -ldflags="-w -s")

**Security Best Practices:**
- Run as non-root user (USER directive)
- Use specific image tags, not :latest
- Scan images for vulnerabilities (Trivy, Snyk)
- Keep base images updated
- Minimize attack surface (fewer packages)
- Use read-only root filesystem when possible

**Singleton Pattern for Containers:**
- Design containers to run single process
- One container = one responsibility
- Use orchestration for multi-container apps
- Avoid running multiple services in one container
- Use init systems (tini) for proper signal handling

**Example with tini:**
```dockerfile
FROM node:18-alpine

# Install tini for proper signal handling
RUN apk add --no-cache tini

# ... rest of Dockerfile ...

# Use tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/server.js"]
```

### Graceful Shutdown Implementation

**Node.js Example:**
```typescript
import express from 'express';
import http from 'http';

const app = express();
const server = http.createServer(app);

// Track active connections
let connections: Set<any> = new Set();

server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => connections.delete(conn));
});

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  console.log(`${signal} received, starting graceful shutdown`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connections
    database.close().then(() => {
      console.log('Database connections closed');
      process.exit(0);
    });
  });

  // Force close after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    connections.forEach(conn => conn.destroy());
    process.exit(1);
  }, 30000); // 30 second timeout
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(3000, () => {
  console.log('Server started on port 3000');
});
```

**Python (FastAPI) Example:**
```python
import signal
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    yield
    # Shutdown
    print("Shutting down gracefully...")
    await database.disconnect()
    await redis.close()

app = FastAPI(lifespan=lifespan)

def signal_handler(sig, frame):
    print(f"Received signal {sig}, shutting down...")
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)
```

**Go Example:**
```go
package main

import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    server := &http.Server{Addr: ":8080"}

    // Start server in goroutine
    go func() {
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit

    log.Println("Shutting down server...")

    // Graceful shutdown with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatal("Server forced to shutdown:", err)
    }

    log.Println("Server exited")
}

**Orchestration:**
- Kubernetes for container orchestration
- Docker Compose for local development
- Helm charts for Kubernetes deployments
- Service mesh (Istio, Linkerd) for advanced networking

**Platform-as-a-Service:**
- AWS Elastic Beanstalk - managed application platform
- Google Cloud Run - serverless containers
- Azure App Service - managed web apps
- Heroku - simple deployment platform
- Railway - modern deployment platform

**Serverless:**
- AWS Lambda - function-as-a-service
- Google Cloud Functions
- Azure Functions
- Vercel - edge functions
- Cloudflare Workers - edge computing

### CI/CD Patterns

**Continuous Integration:**
- Run tests on every commit
- Lint and format checks
- Security scanning (dependencies, code)
- Build verification
- Automated code review

**Continuous Deployment:**
- Deploy to staging on merge to main
- Deploy to production on release tags
- Automated rollback on failures
- Blue-green deployments for zero downtime
- Canary deployments for gradual rollout

**Recommended Tools:**
- GitHub Actions - integrated with GitHub
- GitLab CI - integrated with GitLab
- CircleCI - powerful and flexible
- Jenkins - self-hosted option
- AWS CodePipeline - AWS-native CI/CD

### Monitoring and Observability

**Logging:**
- Structured logging (JSON format)
- Log levels (debug, info, warn, error)
- Correlation IDs for request tracing
- Centralized log aggregation
- Log retention policies

**Metrics:**
- Request rate and latency
- Error rates and types
- Database query performance
- Resource usage (CPU, memory)
- Business metrics (signups, transactions)

**Tracing:**
- Distributed tracing for microservices
- Request flow visualization
- Performance bottleneck identification
- OpenTelemetry for standardized tracing

**Tools:**
- Prometheus + Grafana - metrics and dashboards
- ELK Stack (Elasticsearch, Logstash, Kibana) - logging
- Datadog - all-in-one observability
- New Relic - APM and monitoring
- Sentry - error tracking
- Jaeger - distributed tracing

### Health Checks and Readiness

**Health Check Endpoints:**
- `/health` - basic liveness check
- `/health/ready` - readiness check (database, dependencies)
- Return 200 for healthy, 503 for unhealthy
- Include dependency status in response

**Graceful Shutdown:**
- Handle SIGTERM signal
- Stop accepting new requests
- Complete in-flight requests
- Close database connections
- Timeout after grace period

### Rollback Procedures

**Version Control:**
- Tag releases with semantic versioning
- Maintain release branches
- Document changes in CHANGELOG
- Keep deployment artifacts

**Rollback Strategy:**
- Automated rollback on critical errors
- Database migration rollback plan
- Feature flags for gradual rollout
- Communication plan for incidents

**Deployment Verification:**
- Smoke tests after deployment
- Monitor error rates and metrics
- Automated alerts for anomalies
- Gradual traffic shifting

## API Design Patterns

### REST API Design

**Resource Naming:**
- Use nouns, not verbs: `/users` not `/getUsers`
- Use plural for collections: `/products`
- Nest resources logically: `/users/:id/orders`
- Keep URLs simple and intuitive

**HTTP Methods:**
- GET - retrieve resources (idempotent, cacheable)
- POST - create new resources
- PUT - replace entire resource (idempotent)
- PATCH - partial update
- DELETE - remove resource (idempotent)

**Status Codes:**
- 200 OK - successful GET, PUT, PATCH
- 201 Created - successful POST
- 204 No Content - successful DELETE
- 400 Bad Request - invalid input
- 401 Unauthorized - missing/invalid auth
- 403 Forbidden - insufficient permissions
- 404 Not Found - resource doesn't exist
- 409 Conflict - resource conflict
- 422 Unprocessable Entity - validation error
- 500 Internal Server Error - server error
- 503 Service Unavailable - temporary unavailability

**Response Format:**
```json
{
  "data": { /* resource data */ },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "abc123"
  }
}
```

**Error Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### GraphQL API Design

**Schema Design:**
- Design around client needs
- Use types and interfaces
- Implement pagination (cursor-based)
- Use enums for fixed values
- Provide clear descriptions

**Query Optimization:**
- Implement DataLoader for batching
- Avoid N+1 query problems
- Set query depth limits
- Implement query complexity analysis
- Cache at multiple levels

**Error Handling:**
- Use GraphQL error format
- Provide error codes and messages
- Include field-level errors
- Don't expose internal errors

### gRPC API Design

**Service Definition:**
- Define services in .proto files
- Use protocol buffers for serialization
- Version services appropriately
- Document RPC methods

**Benefits:**
- High performance with binary protocol
- Strong typing with protocol buffers
- Bi-directional streaming
- Code generation for multiple languages

**Use Cases:**
- Microservice communication
- High-performance APIs
- Real-time data streaming
- Internal service APIs

## Authentication & Authorization

### Authentication Strategies

**JWT (JSON Web Tokens):**
- Stateless authentication
- Include claims in token payload
- Set appropriate expiration times
- Implement token refresh mechanism
- Store securely (httpOnly cookies or secure storage)

**OAuth 2.0:**
- Delegated authorization
- Support multiple grant types
- Use for third-party integrations
- Implement PKCE for public clients

**Session-Based:**
- Server-side session storage
- Session cookies with secure flags
- Implement session timeout
- Use Redis for distributed sessions

**API Keys:**
- Simple authentication for service-to-service
- Rotate keys regularly
- Rate limit by API key
- Revoke compromised keys

### Authorization Patterns

**Role-Based Access Control (RBAC):**
- Assign roles to users (admin, user, guest)
- Define permissions for each role
- Check role on each request
- Simple and widely understood

**Attribute-Based Access Control (ABAC):**
- Fine-grained access control
- Based on user attributes, resource attributes, environment
- More flexible than RBAC
- More complex to implement

**Permission-Based:**
- Direct permission assignment
- Check specific permissions
- Combine with roles for flexibility
- Granular control

**Implementation:**
```typescript
// Middleware example
function requirePermission(permission: string) {
  return async (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!user.hasPermission(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

// Usage
app.delete('/api/users/:id', 
  requirePermission('users.delete'),
  deleteUser
);
```

### Security Best Practices

**Password Security:**
- Hash passwords with bcrypt or Argon2
- Enforce strong password requirements
- Implement password reset flow
- Rate limit authentication attempts
- Use multi-factor authentication (MFA)

**Token Security:**
- Use short expiration times
- Implement token refresh
- Validate token signature
- Check token expiration
- Revoke tokens on logout

**API Security:**
- Use HTTPS everywhere
- Implement rate limiting
- Validate all input
- Use security headers
- Regular security audits

## Error Handling & Logging

### Error Handling Patterns

**Centralized Error Handling:**
```typescript
// Error handler middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    path: req.path
  });
  
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details
      }
    });
  }
  
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: err.message
      }
    });
  }
  
  // Don't expose internal errors
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});
```

**Custom Error Classes:**
```typescript
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}
```

**Error Response Format:**
- Consistent error structure
- Error codes for programmatic handling
- Human-readable messages
- Field-level validation errors
- Request ID for tracking

### Logging Best Practices

**Structured Logging:**
```typescript
logger.info('User created', {
  userId: user.id,
  email: user.email,
  requestId: req.id,
  timestamp: new Date().toISOString()
});
```

**Log Levels:**
- DEBUG - detailed debugging information
- INFO - general informational messages
- WARN - warning messages for potential issues
- ERROR - error messages for failures
- FATAL - critical errors requiring immediate attention

**What to Log:**
- Request/response (method, path, status, duration)
- Authentication events (login, logout, failures)
- Business events (user created, order placed)
- Errors and exceptions
- Performance metrics
- Security events

**What NOT to Log:**
- Passwords or secrets
- Credit card numbers
- Personal identifiable information (PII)
- Full request/response bodies (unless necessary)

**Logging Tools:**
- Winston (Node.js) - flexible logging library
- Pino (Node.js) - fast JSON logger
- Python logging - built-in logging module
- Zap (Go) - fast structured logging
- Logback (Java) - reliable logging framework
- tracing (Rust) - application-level tracing

### Observability

**Correlation IDs:**
- Generate unique ID for each request
- Pass through all services
- Include in all log messages
- Return in response headers

**Request Tracing:**
- Track request flow through system
- Measure latency at each step
- Identify bottlenecks
- Visualize service dependencies

**Alerting:**
- Alert on error rate spikes
- Alert on latency increases
- Alert on resource exhaustion
- Alert on security events
- Use appropriate alert channels (email, Slack, PagerDuty)

## Conclusion

This template provides a comprehensive foundation for backend API projects. Adapt these recommendations to your specific project needs, team size, and requirements. The key is to establish consistent patterns early and evolve them as your project grows.

Remember:
- Start with a solid architecture foundation
- Prioritize security from day one
- Write tests for critical functionality
- Implement proper logging and monitoring
- Document your API thoroughly
- Keep dependencies updated
- Plan for scalability
- Iterate based on team feedback and production metrics

For questions or suggestions about this template, consult with your team and adapt it to your organization's specific needs and constraints.
