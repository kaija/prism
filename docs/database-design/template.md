# Database Design Project Template

## Introduction

This template provides comprehensive guidance for establishing database design projects with modern best practices and consistent patterns. Database design projects focus on creating well-structured, performant, and maintainable data models that serve as the foundation for application data storage and retrieval.

Use this template when:
- Designing schemas for new applications or services
- Migrating from one database system to another
- Refactoring existing database structures for better performance or maintainability
- Establishing data architecture for microservices or distributed systems
- Planning data models for analytics, reporting, or data warehousing

Key concerns for database design projects include data integrity, performance, scalability, maintainability, and migration safety. This template addresses these concerns through structured recommendations for technology choices, schema design patterns, and development practices.

## Technology Recommendations

### Recommended Database Systems

**PostgreSQL** (Recommended for general-purpose relational databases)

- Full-featured open-source relational database with ACID compliance
- Rich data types including JSON, arrays, and custom types
- Advanced features: CTEs, window functions, full-text search, GIS support
- Excellent performance with proper indexing and query optimization
- Strong community support and extensive documentation
- MVCC for high concurrency without read locks
- Trade-offs: More complex to tune than simpler databases, higher resource usage than MySQL

**MySQL/MariaDB** (Recommended for read-heavy web applications)
- Popular open-source relational database with wide adoption
- Excellent read performance with query caching
- Simple replication setup for scaling reads
- Large ecosystem of tools and hosting options
- Lower resource requirements than PostgreSQL
- MariaDB offers additional features and better performance
- Trade-offs: Fewer advanced features than PostgreSQL, less strict about data integrity by default

**MongoDB** (Recommended for flexible, document-oriented data)
- NoSQL document database with flexible schema
- Excellent for rapidly evolving data models
- Native JSON/BSON storage with rich query capabilities
- Horizontal scaling with sharding built-in
- Good for hierarchical or nested data structures
- Aggregation pipeline for complex data transformations
- Trade-offs: No joins (use $lookup), eventual consistency in distributed setups, larger storage footprint

**Redis** (Recommended for caching and real-time data)
- In-memory data store with optional persistence
- Extremely fast read/write operations (sub-millisecond)
- Rich data structures: strings, hashes, lists, sets, sorted sets, streams
- Pub/sub messaging for real-time features
- Excellent for caching, session storage, rate limiting, leaderboards
- Supports Lua scripting for atomic operations
- Trade-offs: Limited by available RAM, not suitable as primary database for large datasets

**SQLite** (Recommended for embedded or local-first applications)
- Serverless, self-contained SQL database engine
- Zero configuration and no separate server process
- Excellent for mobile apps, desktop applications, and prototyping
- ACID compliant with full SQL support
- Single file database for easy backup and distribution
- Very fast for read-heavy workloads
- Trade-offs: Limited concurrency (single writer), not suitable for high-traffic web applications

### Technology Stack

**Core Technologies:**
- Database management system (see recommendations above)
- Migration tool: Flyway, Liquibase, Alembic, golang-migrate, or framework-specific tools
- Schema design tool: dbdiagram.io, DrawSQL, or database-specific tools
- Query builder or ORM: Prisma, TypeORM, SQLAlchemy, GORM, Diesel

**Supporting Tools:**
- Database client: pgAdmin (PostgreSQL), MySQL Workbench, MongoDB Compass, RedisInsight
- Version control: Git for migration files and schema documentation
- Testing tools: Database-specific testing libraries, Docker for test databases
- Monitoring: pg_stat_statements (PostgreSQL), slow query log (MySQL), MongoDB profiler

## Schema Design Patterns

### Normalization and Denormalization

**Normalization** (Recommended for transactional systems)
- Organize data to reduce redundancy and improve data integrity
- First Normal Form (1NF): Atomic values, no repeating groups
- Second Normal Form (2NF): No partial dependencies on composite keys
- Third Normal Form (3NF): No transitive dependencies
- Benefits: Data consistency, easier updates, reduced storage
- Use when: Data integrity is critical, updates are frequent, storage is a concern
- Trade-offs: More joins required, potentially slower read queries

**Denormalization** (Recommended for read-heavy systems)
- Intentionally introduce redundancy to optimize read performance
- Store computed values, aggregates, or duplicated data
- Reduce joins by combining related data into single tables
- Benefits: Faster queries, simpler query logic, better read performance
- Use when: Read performance is critical, data is mostly read-only, eventual consistency is acceptable
- Trade-offs: Data redundancy, more complex update logic, potential inconsistencies

**Hybrid Approach** (Recommended for most applications)
- Normalize core transactional data for integrity
- Denormalize read-heavy views or reporting tables
- Use materialized views or separate read models
- Balance between data integrity and query performance
- Consider CQRS pattern for complex domains

### Data Modeling Patterns

**Entity-Relationship Modeling**
- Identify entities (tables) and their relationships
- Define primary keys for unique identification
- Establish foreign keys for referential integrity
- Choose relationship types: one-to-one, one-to-many, many-to-many
- Use junction tables for many-to-many relationships

**Document Modeling** (for NoSQL databases)
- Embed related data within documents for common access patterns
- Reference other documents when data is accessed independently
- Denormalize frequently accessed data
- Consider document size limits and update patterns
- Design for your query patterns, not normalized structure

**Time-Series Data Modeling**
- Partition by time for efficient querying and archival
- Use appropriate granularity for timestamps
- Consider retention policies and data aggregation
- Index on time columns for range queries
- Use specialized time-series databases for high-volume data

**Audit and History Tracking**
- Temporal tables for automatic history tracking
- Separate audit tables with triggers
- Event sourcing for complete change history
- Include created_at, updated_at, deleted_at timestamps
- Store user information for accountability

## Architecture Patterns

### Data Access Patterns

**Repository Pattern**
- Abstract database access behind repository interfaces
- Encapsulate query logic and data mapping
- Enable easier testing with mock repositories
- Separate domain logic from data access concerns
- Benefits: Testability, flexibility to change data sources
- Trade-offs: Additional abstraction layer, potential over-engineering for simple apps

**Data Mapper Pattern**
- Separate domain objects from database representation
- Use mapper classes to translate between layers
- Keep domain models independent of persistence
- Benefits: Clean separation of concerns, domain-driven design support
- Trade-offs: More code to maintain, complexity for simple CRUD

**Active Record Pattern**
- Domain objects include database access methods
- Simple and intuitive for CRUD operations
- Common in frameworks like Rails, Laravel
- Benefits: Less boilerplate, faster development
- Trade-offs: Tight coupling between domain and persistence, harder to test

**Query Object Pattern**
- Encapsulate complex queries in reusable objects
- Compose queries from smaller, testable pieces
- Benefits: Reusable query logic, easier testing, better organization
- Use for: Complex filtering, sorting, pagination logic

### Connection Management

**Connection Pooling**
- Reuse database connections across requests
- Configure pool size based on workload and database capacity
- Typical pool size: 10-50 connections for web applications
- Monitor pool utilization and adjust as needed
- Use connection timeouts to prevent resource exhaustion
- Benefits: Reduced connection overhead, better resource utilization

**Connection Per Request**
- Acquire connection at request start, release at request end
- Use middleware or framework features for automatic management
- Ensure connections are always released (use try/finally or defer)
- Benefits: Simple lifecycle, prevents connection leaks

**Read Replicas**
- Route read queries to replica databases
- Route write queries to primary database
- Implement retry logic for replication lag
- Benefits: Horizontal scaling for reads, improved performance
- Trade-offs: Eventual consistency, increased complexity

**Database Sharding**
- Partition data across multiple database instances
- Choose shard key based on access patterns
- Consider: range-based, hash-based, or geographic sharding
- Benefits: Horizontal scaling for writes, larger total capacity
- Trade-offs: Complex queries across shards, difficult to rebalance

## Best Practices

### Data Integrity Principles

**Use Constraints**
- Define NOT NULL constraints for required fields
- Use UNIQUE constraints to prevent duplicates
- Implement CHECK constraints for data validation
- Establish FOREIGN KEY constraints for referential integrity
- Benefits: Database-level validation, data consistency guarantees

**Atomic Operations**
- Use transactions for multi-step operations
- Ensure ACID properties: Atomicity, Consistency, Isolation, Durability
- Set appropriate isolation levels based on consistency needs
- Use optimistic or pessimistic locking for concurrent updates
- Benefits: Data consistency, prevents partial updates

**Default Values**
- Provide sensible defaults for optional fields
- Use database defaults rather than application defaults when possible
- Consider: timestamps (CURRENT_TIMESTAMP), booleans (false), status fields
- Benefits: Consistent data, simpler application logic

**Data Validation**
- Validate at multiple layers: database, application, client
- Use database constraints as last line of defense
- Implement application-level validation for complex rules
- Consider: format validation, range checks, business rule validation
- Benefits: Defense in depth, better error messages

### Performance Principles

**Index Strategically**
- Index columns used in WHERE, JOIN, ORDER BY clauses
- Create composite indexes for multi-column queries
- Avoid over-indexing (impacts write performance)
- Monitor index usage and remove unused indexes
- Consider: covering indexes, partial indexes, expression indexes
- Benefits: Faster queries, efficient data retrieval

**Optimize Queries**
- Use EXPLAIN/EXPLAIN ANALYZE to understand query plans
- Avoid SELECT * - specify only needed columns
- Limit result sets with pagination
- Use appropriate JOIN types (INNER, LEFT, etc.)
- Avoid N+1 queries - use eager loading or batch queries
- Benefits: Reduced load, faster response times

**Batch Operations**
- Use bulk inserts/updates instead of individual operations
- Batch multiple operations in single transaction when appropriate
- Consider: COPY command (PostgreSQL), LOAD DATA (MySQL), bulk write (MongoDB)
- Benefits: Reduced overhead, better performance

**Caching Strategy**
- Cache frequently accessed, rarely changing data
- Use Redis or Memcached for application-level caching
- Implement cache invalidation strategy
- Consider: query result caching, computed value caching
- Benefits: Reduced database load, faster response times

**Partitioning**
- Partition large tables by range, list, or hash
- Common partition keys: date, region, customer ID
- Benefits: Improved query performance, easier archival, better maintenance
- Trade-offs: Increased complexity, not all databases support partitioning

### Security Principles

**Least Privilege Access**
- Create separate database users for different application components
- Grant minimum necessary permissions
- Use read-only users for reporting and analytics
- Avoid using superuser accounts in applications
- Benefits: Reduced attack surface, limited blast radius

**Protect Sensitive Data**
- Encrypt sensitive data at rest and in transit
- Use SSL/TLS for database connections
- Hash passwords with strong algorithms (bcrypt, Argon2)
- Consider: column-level encryption, transparent data encryption
- Benefits: Data protection, compliance with regulations

**SQL Injection Prevention**
- Always use parameterized queries or prepared statements
- Never concatenate user input into SQL strings
- Use ORM query builders that handle escaping
- Validate and sanitize all user input
- Benefits: Protection against SQL injection attacks

**Audit Logging**
- Log all data modifications with user and timestamp
- Track schema changes and migrations
- Monitor for suspicious query patterns
- Consider: database audit logs, application-level logging
- Benefits: Accountability, forensics, compliance

## Naming Conventions

### Table Names

**Use Plural Nouns** (Recommended)
- Tables represent collections of entities: `users`, `orders`, `products`
- Alternative: Singular nouns (`user`, `order`, `product`) - choose one and be consistent
- Use lowercase with underscores for multi-word names: `order_items`, `user_preferences`
- Avoid prefixes like `tbl_` - they add no value
- Be descriptive but concise: `customer_addresses` not `customer_address_information`

**Junction Tables**
- Name after both related tables: `users_roles`, `products_categories`
- Alternative: Descriptive name for the relationship: `memberships`, `categorizations`
- Use alphabetical ordering for consistency: `posts_tags` not `tags_posts`

**Temporal or Audit Tables**
- Suffix with purpose: `orders_history`, `users_audit`, `products_archive`
- Alternative: Prefix with purpose: `archive_orders`, `audit_users`

### Column Names

**Use Descriptive Names**
- Clear and unambiguous: `email_address` not `email`, `created_at` not `created`
- Use lowercase with underscores: `first_name`, `order_total`, `is_active`
- Avoid abbreviations unless universally understood: `id` is fine, `usr_nm` is not
- Include units when relevant: `timeout_seconds`, `file_size_bytes`, `price_cents`

**Primary Keys**
- Simple primary key: `id` (most common)
- Alternative: `{table_name}_id` for clarity: `user_id`, `order_id`
- Composite keys: Use meaningful column names: `(user_id, role_id)`

**Foreign Keys**
- Reference the related table: `user_id`, `product_id`, `category_id`
- For multiple references to same table: `author_id`, `reviewer_id` (both reference `users`)
- Be consistent with primary key naming convention

**Boolean Columns**
- Use `is_`, `has_`, `can_`, or `should_` prefixes: `is_active`, `has_discount`, `can_edit`
- Alternative: Positive adjectives: `active`, `verified`, `published`
- Avoid negative names: `is_not_deleted` - use `is_active` instead

**Timestamp Columns**
- Standard timestamps: `created_at`, `updated_at`, `deleted_at`
- Event-specific: `published_at`, `expired_at`, `last_login_at`
- Use `_at` suffix for timestamps, `_on` for dates: `created_at`, `birth_date`

### Constraint Names

**Primary Key Constraints**
- Format: `pk_{table_name}` or `{table_name}_pkey`
- Example: `pk_users`, `users_pkey`
- Many databases auto-generate these - override if you need consistency

**Foreign Key Constraints**
- Format: `fk_{table}_{referenced_table}` or `fk_{table}_{column}`
- Example: `fk_orders_users`, `fk_orders_user_id`
- Include column name if multiple FKs to same table: `fk_orders_author_id`, `fk_orders_reviewer_id`

**Unique Constraints**
- Format: `uq_{table}_{column}` or `uq_{table}_{column1}_{column2}`
- Example: `uq_users_email`, `uq_users_username`, `uq_order_items_order_id_product_id`
- Descriptive for business rules: `uq_active_subscription_per_user`

**Check Constraints**
- Format: `ck_{table}_{column}_{condition}` or `ck_{table}_{description}`
- Example: `ck_users_age_positive`, `ck_orders_total_non_negative`
- Be descriptive: `ck_products_price_greater_than_cost`

### Index Names

**Single Column Indexes**
- Format: `idx_{table}_{column}` or `ix_{table}_{column}`
- Example: `idx_users_email`, `idx_orders_created_at`

**Composite Indexes**
- Format: `idx_{table}_{column1}_{column2}` or `idx_{table}_{purpose}`
- Example: `idx_orders_user_id_created_at`, `idx_orders_user_date_lookup`
- Limit name length - use purpose-based names for complex indexes

**Unique Indexes**
- Format: `uidx_{table}_{column}` or use unique constraint instead
- Example: `uidx_users_email`

**Partial/Filtered Indexes**
- Format: `idx_{table}_{column}_{condition}`
- Example: `idx_orders_created_at_pending`, `idx_users_email_active`

**Full-Text Indexes**
- Format: `ftidx_{table}_{column}` or `fts_{table}_{column}`
- Example: `ftidx_products_description`, `fts_articles_content`

## Testing Approaches

### Schema Testing

**Schema Validation Tests**
- Verify tables exist with expected columns and data types
- Check constraints are properly defined (NOT NULL, UNIQUE, CHECK)
- Validate foreign key relationships and referential integrity
- Confirm indexes exist on expected columns
- Test default values are correctly applied
- Tools: Database introspection, schema comparison tools

**Migration Testing**
- Test migrations apply cleanly on fresh database
- Test migrations are idempotent (can run multiple times safely)
- Verify rollback/down migrations restore previous state
- Test migration order and dependencies
- Validate data transformations during migrations
- Use: Separate test database, automated migration runners

**Schema Evolution Tests**
- Test backward compatibility of schema changes
- Verify existing queries still work after migrations
- Test that old application versions can handle new schema
- Validate data integrity after schema changes
- Consider: Blue-green deployments, feature flags

### Query Testing

**Unit Tests for Queries**
- Test individual queries return expected results
- Use known test data with predictable outcomes
- Test query performance with EXPLAIN plans
- Verify correct handling of NULL values
- Test edge cases: empty results, single row, large result sets
- Mock or use test database with controlled data

**Integration Tests**
- Test queries with realistic data volumes
- Verify transactions commit or rollback correctly
- Test concurrent access scenarios
- Validate query performance under load
- Test connection pooling and resource management
- Use: Docker containers with test databases

**Query Performance Tests**
- Benchmark critical queries with production-like data volumes
- Set performance thresholds and fail tests if exceeded
- Test query plans remain optimal after schema changes
- Identify slow queries and N+1 query problems
- Tools: EXPLAIN ANALYZE, query profilers, APM tools

**Parameterized Query Tests**
- Verify prepared statements work correctly
- Test SQL injection prevention
- Validate parameter binding for all data types
- Test NULL parameter handling
- Ensure query plans are cached and reused

### Migration Testing

**Pre-Migration Validation**
- Verify current schema state matches expected version
- Check for data that might violate new constraints
- Validate sufficient disk space for migration
- Test migration on copy of production data
- Backup database before migration

**Migration Execution Tests**
- Test migration runs within acceptable time window
- Verify no data loss during migration
- Test rollback procedures work correctly
- Validate application continues working during migration (for online migrations)
- Monitor database performance during migration

**Post-Migration Validation**
- Verify schema matches expected final state
- Validate data integrity after migration
- Check all constraints are enforced
- Test application functionality with new schema
- Verify indexes are created and used
- Run smoke tests on critical queries

**Continuous Integration**
- Run migrations in CI pipeline on every commit
- Test against multiple database versions if supporting multiple
- Validate migrations on different operating systems
- Test with different database configurations
- Fail build if migrations don't apply cleanly

### Test Data Management

**Test Data Strategies**
- Fixtures: Static test data loaded before tests
- Factories: Generate test data programmatically
- Seeders: Populate database with realistic data
- Anonymized production data: Real data with PII removed
- Synthetic data: Generated data matching production patterns

**Test Database Isolation**
- Use separate database for each test suite
- Reset database state between tests
- Use transactions and rollback for test isolation
- Consider: In-memory databases for fast tests (SQLite)
- Docker containers for consistent test environments

**Test Data Cleanup**
- Clean up test data after tests complete
- Use database transactions for automatic rollback
- Implement teardown methods to remove test data
- Avoid polluting shared test databases
- Consider: Temporary tables, separate schemas

## Migration & Versioning

### Migration Strategies

**Sequential Migrations** (Recommended)
- Each migration has a version number or timestamp
- Migrations run in order from current version to target version
- Track applied migrations in database table
- Never modify existing migrations - create new ones for changes
- Benefits: Clear history, easy to reason about, standard approach
- Tools: Flyway, Liquibase, Alembic, golang-migrate, Rails migrations

**State-Based Migrations**
- Define desired schema state, tool generates migrations
- Compare current schema to desired state
- Automatically create ALTER statements
- Benefits: Less manual work, focus on end state
- Trade-offs: Less control over migration process, harder to handle data transformations
- Tools: Prisma Migrate, Entity Framework Migrations

**Hybrid Approach**
- Use sequential migrations for structural changes
- Use state-based tools for initial schema generation
- Manually create migrations for complex data transformations
- Benefits: Best of both worlds, flexibility

### Migration Best Practices

**Keep Migrations Small**
- One logical change per migration
- Easier to review, test, and rollback
- Reduces risk of partial failures
- Faster execution time per migration

**Make Migrations Reversible**
- Provide both up and down migrations
- Test rollback procedures regularly
- Some changes are irreversible (data deletion) - document this
- Consider: Point-in-time recovery as alternative to rollback

**Handle Data Transformations Carefully**
- Separate schema changes from data migrations when possible
- Use batching for large data transformations
- Add timeouts and progress logging
- Test with production-sized datasets
- Consider: Background jobs for large transformations

**Avoid Breaking Changes**
- Add new columns as nullable first, backfill data, then add NOT NULL
- Keep old columns during transition period, remove later
- Use database views for backward compatibility
- Coordinate schema changes with application deployments

**Version Control Migrations**
- Store migration files in version control with application code
- Use descriptive names: `20240115_add_user_email_index.sql`
- Include both timestamp and description in filename
- Review migrations in code review process

### Rollback Procedures

**Automatic Rollback**
- Database transactions for atomic migrations
- Rollback on error during migration execution
- Limitations: DDL statements may not be transactional in some databases
- Test rollback procedures in staging environment

**Manual Rollback**
- Create down migrations for each up migration
- Document rollback steps in migration comments
- Test rollback on copy of production data
- Have rollback plan ready before production deployment

**Point-in-Time Recovery**
- Alternative to rollback for data-destructive changes
- Restore database to state before migration
- Requires: Regular backups, transaction log archiving
- Trade-off: Lose data created after migration

**Forward-Fix**
- Sometimes safer to fix forward than rollback
- Create new migration to correct issue
- Especially for data-destructive rollbacks
- Document decision and reasoning

### Schema Versioning

**Version Tracking**
- Store schema version in database table
- Track: version number, applied timestamp, migration name
- Standard table: `schema_migrations` or `flyway_schema_history`
- Query current version: `SELECT MAX(version) FROM schema_migrations`

**Version Numbering**
- Timestamp-based: `20240115143022` (YYYYMMDDHHmmss)
- Sequential: `001`, `002`, `003` or `1`, `2`, `3`
- Semantic versioning: `1.0.0`, `1.1.0`, `2.0.0`
- Choose one system and be consistent

**Branching and Merging**
- Timestamp-based versions handle branches naturally
- Sequential versions may conflict - resolve by renumbering
- Communicate with team about migration creation
- Run migrations in order regardless of creation order

**Environment Consistency**
- Ensure all environments run same migrations
- Verify schema version matches expected version
- Automate migration execution in deployment pipeline
- Use schema comparison tools to detect drift

## Deployment Considerations

### Migration Execution

**Automated Migration Execution**
- Run migrations automatically during deployment
- Include in CI/CD pipeline
- Use deployment tools: Kubernetes init containers, deployment scripts
- Verify migration success before deploying application
- Benefits: Consistent process, reduced human error

**Manual Migration Execution**
- Run migrations manually before deployment
- Useful for: Large migrations, high-risk changes, production databases
- Requires: Coordination with deployment team, maintenance window
- Benefits: More control, ability to monitor and intervene

**Migration Timing**
- Before application deployment: Ensure schema ready for new code
- During maintenance window: For breaking changes or long-running migrations
- Off-peak hours: Minimize impact on users
- Consider: Time zones, business hours, traffic patterns

**Migration Monitoring**
- Log migration progress and completion
- Monitor database performance during migration
- Set up alerts for migration failures
- Track migration duration for capacity planning
- Use: Database monitoring tools, application logs

### Zero-Downtime Deployments

**Backward-Compatible Migrations**
- New code works with old schema
- Old code works with new schema
- Deploy in phases: schema change, then code change
- Example: Add nullable column, deploy code, backfill data, add NOT NULL

**Expand-Contract Pattern**
- Expand: Add new schema elements (columns, tables)
- Migrate: Dual-write to old and new schema
- Contract: Remove old schema elements after transition
- Phases: 3 deployments (expand, migrate, contract)
- Benefits: Zero downtime, safe rollback

**Blue-Green Deployments**
- Maintain two identical environments (blue and green)
- Deploy to inactive environment, run migrations
- Switch traffic to new environment
- Keep old environment for quick rollback
- Benefits: Fast rollback, minimal downtime

**Database Views for Compatibility**
- Create views that present old schema structure
- Allows old code to work with new schema
- Gradually migrate code to use new schema
- Remove views after transition complete
- Benefits: Smooth transition, backward compatibility

**Feature Flags**
- Use feature flags to control new schema usage
- Enable new features gradually
- Rollback by disabling flag, not rolling back schema
- Benefits: Decouple deployment from release

### High-Availability Considerations

**Replication Lag**
- Monitor replication lag during migrations
- Ensure replicas catch up before switching traffic
- Consider: Pausing writes, throttling migration
- Test application behavior with replication lag

**Connection Draining**
- Gracefully close existing connections before migration
- Allow in-flight requests to complete
- Use connection pooling with max lifetime
- Benefits: Avoid interrupting active transactions

**Lock Management**
- Minimize table locks during migrations
- Use online DDL operations when available
- Consider: `ALGORITHM=INPLACE` (MySQL), `CONCURRENTLY` (PostgreSQL)
- Break large operations into smaller chunks

**Failover Planning**
- Test migrations on replica before primary
- Have rollback plan for each migration
- Document failover procedures
- Ensure monitoring and alerting are in place

### Environment-Specific Considerations

**Development Environment**
- Fast iteration: Drop and recreate database frequently
- Use seeders for test data
- Run migrations automatically on startup
- Less concern about downtime or data loss

**Staging Environment**
- Mirror production setup as closely as possible
- Test migrations with production-like data volumes
- Practice deployment procedures
- Validate performance and timing

**Production Environment**
- Maximum caution: Test thoroughly in staging first
- Schedule migrations during maintenance windows
- Have rollback plan ready
- Monitor closely during and after migration
- Communicate with stakeholders about timing

**Multi-Tenant Considerations**
- Run migrations across all tenant databases
- Consider: Parallel execution, batching, progress tracking
- Handle failures gracefully - some tenants may fail
- Test with different tenant data patterns
- Use: Migration orchestration tools, job queues

## Indexing & Performance

### Index Types

**B-Tree Indexes** (Default for most databases)
- Balanced tree structure for efficient lookups
- Good for: Equality and range queries, sorting
- Supports: <, <=, =, >=, >, BETWEEN, IN, ORDER BY
- Most common index type - use unless you have specific needs
- Example: `CREATE INDEX idx_users_email ON users(email)`

**Hash Indexes**
- Fast equality lookups using hash function
- Good for: Exact match queries only
- Not suitable for: Range queries, sorting
- Limited support: PostgreSQL (rarely used), MySQL (memory tables)
- Example: `CREATE INDEX idx_users_id USING HASH ON users(id)`

**GiST Indexes** (Generalized Search Tree - PostgreSQL)
- Flexible index structure for complex data types
- Good for: Geometric data, full-text search, range types
- Supports: Overlaps, contains, is contained by
- Use for: PostGIS, full-text search, custom operators
- Example: `CREATE INDEX idx_locations_point USING GIST ON locations(point)`

**GIN Indexes** (Generalized Inverted Index - PostgreSQL)
- Inverted index for composite values
- Good for: Arrays, JSONB, full-text search
- Fast for: Containment queries (@>, ?, ?&, ?|)
- Slower to update than B-tree, but faster for complex queries
- Example: `CREATE INDEX idx_products_tags USING GIN ON products(tags)`

**Full-Text Indexes**
- Specialized for text search
- Good for: Searching within text content
- Features: Stemming, ranking, phrase search
- PostgreSQL: `CREATE INDEX idx_articles_content USING GIN ON articles(to_tsvector('english', content))`
- MySQL: `CREATE FULLTEXT INDEX idx_articles_content ON articles(content)`

**Spatial Indexes**
- Optimized for geographic data
- Good for: Location-based queries, proximity search
- Requires: PostGIS extension (PostgreSQL), spatial extensions (MySQL)
- Example: `CREATE INDEX idx_locations_geom USING GIST ON locations(geom)`

**Partial/Filtered Indexes**
- Index only rows matching a condition
- Good for: Queries with common WHERE clauses
- Smaller index size, faster updates
- PostgreSQL: `CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending'`
- SQL Server: `CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending'`

**Covering Indexes**
- Include all columns needed by query
- Avoids table lookup (index-only scan)
- PostgreSQL: `CREATE INDEX idx_users_email_name ON users(email) INCLUDE (first_name, last_name)`
- Benefits: Faster queries, reduced I/O

**Composite Indexes**
- Index on multiple columns
- Column order matters: Most selective first, or match query patterns
- Good for: Queries filtering on multiple columns
- Example: `CREATE INDEX idx_orders_user_date ON orders(user_id, created_at)`
- Use for: `WHERE user_id = ? AND created_at > ?`

### Query Optimization

**Use EXPLAIN Plans**
- Analyze query execution before optimization
- Identify: Sequential scans, missing indexes, inefficient joins
- PostgreSQL: `EXPLAIN ANALYZE SELECT ...`
- MySQL: `EXPLAIN SELECT ...`
- Look for: High cost, large row counts, sequential scans on large tables

**Avoid SELECT ***
- Fetch only columns you need
- Reduces: Network transfer, memory usage, I/O
- Especially important for: Large tables, tables with TEXT/BLOB columns
- Good: `SELECT id, name, email FROM users`
- Bad: `SELECT * FROM users`

**Limit Result Sets**
- Use LIMIT/OFFSET for pagination
- Avoid: Fetching all rows and paginating in application
- Consider: Cursor-based pagination for large datasets
- Example: `SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 40`

**Optimize JOIN Operations**
- Use appropriate JOIN type: INNER, LEFT, RIGHT
- Join on indexed columns
- Filter early: Apply WHERE conditions before JOIN when possible
- Consider: JOIN order (smaller tables first)
- Avoid: Cartesian products (missing JOIN conditions)

**Avoid N+1 Queries**
- Fetch related data in single query instead of loop
- Use: JOINs, subqueries, or IN clauses
- ORM solutions: Eager loading, includes
- Example: Instead of fetching user for each order, JOIN users table
- Tools: ORM query logging, APM tools to detect N+1

**Use Appropriate Data Types**
- Smaller types = better performance
- INT vs BIGINT: Use INT unless you need > 2 billion
- VARCHAR vs TEXT: Use VARCHAR with appropriate length
- TIMESTAMP vs DATETIME: Choose based on needs
- Benefits: Less storage, faster comparisons, better index efficiency

**Batch Operations**
- Insert/update multiple rows in single query
- Use: Bulk inserts, multi-row INSERT statements
- PostgreSQL: `INSERT INTO users (name) VALUES ('Alice'), ('Bob'), ('Charlie')`
- Benefits: Reduced round trips, better performance

**Query Caching**
- Cache frequently accessed, rarely changing data
- Application-level: Redis, Memcached
- Database-level: Query cache (MySQL - deprecated), materialized views
- Invalidation: Time-based, event-based
- Benefits: Reduced database load, faster response

### EXPLAIN Plan Analysis

**Reading EXPLAIN Output**
- Cost: Estimated query cost (not time, relative measure)
- Rows: Estimated number of rows
- Width: Average row size in bytes
- Actual time: Real execution time (with ANALYZE)
- Loops: Number of times node was executed

**Common Plan Nodes**
- Seq Scan: Full table scan - slow for large tables
- Index Scan: Using index to find rows - good
- Index Only Scan: All data from index - best
- Bitmap Index Scan: Multiple index scans combined
- Nested Loop: Join method for small datasets
- Hash Join: Join method for larger datasets
- Merge Join: Join on sorted data

**Optimization Indicators**
- High cost on Seq Scan: Add index
- High row count estimate vs actual: Update statistics
- Nested Loop on large tables: Consider Hash Join
- Multiple sequential scans: Add indexes or denormalize
- Index not used: Check query conditions, index column order

**Statistics and Vacuuming**
- Keep statistics up to date: `ANALYZE` (PostgreSQL), `ANALYZE TABLE` (MySQL)
- Vacuum regularly: `VACUUM` (PostgreSQL) to reclaim space
- Auto-vacuum: Enable and tune for production
- Benefits: Better query plans, accurate cost estimates

### Performance Monitoring

**Key Metrics**
- Query execution time: Slow query log, APM tools
- Index usage: pg_stat_user_indexes (PostgreSQL)
- Cache hit ratio: Buffer cache, query cache
- Connection pool utilization: Active vs idle connections
- Lock contention: Blocked queries, deadlocks
- Replication lag: For read replicas

**Slow Query Logging**
- Enable slow query log to identify problematic queries
- PostgreSQL: `log_min_duration_statement = 1000` (log queries > 1s)
- MySQL: `slow_query_log = 1`, `long_query_time = 1`
- Analyze: Most frequent slow queries, highest total time
- Tools: pgBadger, pt-query-digest

**Index Monitoring**
- Identify unused indexes: Remove to improve write performance
- Identify missing indexes: Analyze slow queries
- Monitor index size: Large indexes impact performance
- PostgreSQL: `pg_stat_user_indexes`, `pg_index`
- MySQL: `SHOW INDEX FROM table`

**Performance Testing**
- Load testing: Simulate production traffic
- Benchmark critical queries: Set performance baselines
- Test with production-like data volumes
- Monitor: Response times, throughput, resource usage
- Tools: Apache JMeter, k6, pgbench

## Data Integrity

### Constraints

**NOT NULL Constraints**
- Prevent NULL values in columns
- Use for: Required fields, mandatory data
- Define at column level: `email VARCHAR(255) NOT NULL`
- Benefits: Data completeness, prevents missing critical data
- Consider: Default values for optional fields vs NOT NULL

**UNIQUE Constraints**
- Ensure column values are unique across table
- Use for: Email addresses, usernames, SKUs
- Single column: `UNIQUE (email)`
- Multiple columns: `UNIQUE (user_id, role_id)`
- Creates implicit index for enforcement
- Benefits: Prevents duplicates, enforces business rules

**PRIMARY KEY Constraints**
- Combines NOT NULL and UNIQUE
- Identifies each row uniquely
- One primary key per table
- Single column: `id SERIAL PRIMARY KEY`
- Composite: `PRIMARY KEY (user_id, role_id)`
- Benefits: Row identification, foreign key references

**FOREIGN KEY Constraints**
- Enforces referential integrity between tables
- Ensures referenced row exists in parent table
- Syntax: `FOREIGN KEY (user_id) REFERENCES users(id)`
- Prevents: Orphaned records, invalid references
- Benefits: Data consistency, relationship enforcement

**CHECK Constraints**
- Validates data against custom conditions
- Use for: Range checks, format validation, business rules
- Examples:
  - `CHECK (age >= 0)`
  - `CHECK (price > cost)`
  - `CHECK (status IN ('pending', 'active', 'completed'))`
- Benefits: Database-level validation, data quality

**DEFAULT Constraints**
- Provides default value when none specified
- Use for: Timestamps, status fields, boolean flags
- Examples:
  - `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  - `is_active BOOLEAN DEFAULT true`
  - `status VARCHAR(20) DEFAULT 'pending'`
- Benefits: Consistent defaults, simpler inserts

### Referential Integrity

**CASCADE Actions**
- Automatically propagate changes to related rows
- ON DELETE CASCADE: Delete child rows when parent deleted
- ON UPDATE CASCADE: Update foreign keys when parent key changes
- Use carefully: Can delete large amounts of data
- Example: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`

**RESTRICT Actions**
- Prevent deletion/update if child rows exist
- ON DELETE RESTRICT: Cannot delete parent with children
- ON UPDATE RESTRICT: Cannot update parent key with children
- Default behavior in most databases
- Benefits: Prevents accidental data loss

**SET NULL Actions**
- Set foreign key to NULL when parent deleted/updated
- ON DELETE SET NULL: Orphan child rows with NULL foreign key
- ON UPDATE SET NULL: Clear foreign key on parent key change
- Requires: Foreign key column allows NULL
- Use for: Optional relationships

**SET DEFAULT Actions**
- Set foreign key to default value when parent deleted/updated
- Less commonly used than other actions
- Requires: Default value defined for foreign key column
- Use for: Fallback relationships

**Circular References**
- Avoid circular foreign key dependencies
- Use: Nullable foreign keys, deferred constraints
- Consider: Redesigning schema to eliminate cycles
- PostgreSQL: `SET CONSTRAINTS ALL DEFERRED` within transaction

### Validation Patterns

**Database-Level Validation**
- Use constraints for critical business rules
- Advantages: Always enforced, cannot be bypassed
- Limitations: Limited expressiveness, harder to change
- Examples: NOT NULL, CHECK constraints, foreign keys
- Best for: Fundamental data integrity rules

**Application-Level Validation**
- Validate in application code before database
- Advantages: Rich validation logic, better error messages
- Limitations: Can be bypassed, inconsistent across applications
- Examples: Format validation, complex business rules
- Best for: User-facing validation, complex rules

**Trigger-Based Validation**
- Use database triggers for complex validation
- Advantages: Enforced at database level, supports complex logic
- Limitations: Hidden logic, performance impact, harder to test
- Examples: Cross-table validation, audit logging
- Use sparingly: Prefer constraints when possible

**Multi-Layer Validation**
- Validate at multiple layers for defense in depth
- Client-side: Immediate feedback, better UX
- Application-side: Business logic, complex rules
- Database-side: Final enforcement, data integrity
- Benefits: Best user experience with strong guarantees

### Data Quality

**Normalization for Integrity**
- Reduce redundancy to prevent inconsistencies
- Store each fact once
- Use foreign keys to reference related data
- Benefits: Single source of truth, easier updates
- Trade-off: More joins, potentially slower reads

**Denormalization Trade-offs**
- Intentional redundancy for performance
- Requires: Careful update logic to maintain consistency
- Consider: Triggers, application logic, eventual consistency
- Use when: Read performance critical, data rarely changes
- Monitor: Data consistency, update complexity

**Audit Trails**
- Track all changes to critical data
- Methods: Audit tables, temporal tables, event sourcing
- Include: Who, what, when, old value, new value
- Benefits: Accountability, debugging, compliance
- Consider: Storage costs, query performance

**Data Validation on Import**
- Validate data before bulk imports
- Check: Format, constraints, referential integrity
- Use: Staging tables, validation scripts
- Rollback: If validation fails
- Benefits: Prevent corrupt data, maintain integrity

**Soft Deletes**
- Mark records as deleted instead of removing
- Add: `deleted_at TIMESTAMP NULL`
- Filter: `WHERE deleted_at IS NULL` in queries
- Benefits: Data recovery, audit trail, referential integrity
- Trade-offs: Larger tables, more complex queries
- Consider: Archival strategy for old deleted records

## Backup & Recovery

### Backup Strategies

**Full Backups**
- Complete copy of entire database
- Simplest to restore: Single backup file
- Frequency: Daily, weekly, or monthly depending on data volume
- Storage: Requires most space
- Tools: pg_dump (PostgreSQL), mysqldump (MySQL), mongodump (MongoDB)
- Example: `pg_dump -U postgres -d mydb > backup.sql`

**Incremental Backups**
- Only changes since last backup
- Smaller backup size, faster execution
- Restore: Requires base backup + all incremental backups
- Frequency: Hourly or daily
- Tools: pg_basebackup + WAL archiving (PostgreSQL), binary logs (MySQL)
- Benefits: Less storage, faster backups

**Differential Backups**
- Changes since last full backup
- Restore: Requires full backup + latest differential
- Faster restore than incremental
- Larger than incremental, smaller than full
- Use: Balance between full and incremental

**Continuous Archiving**
- Archive transaction logs continuously
- Enables point-in-time recovery
- PostgreSQL: WAL (Write-Ahead Log) archiving
- MySQL: Binary log archiving
- Benefits: Minimal data loss, flexible recovery

**Snapshot Backups**
- Filesystem or storage-level snapshots
- Very fast: Copy-on-write technology
- Requires: Filesystem support (LVM, ZFS, cloud storage)
- Benefits: Minimal downtime, fast backup and restore
- Limitations: Same storage system, not offsite

### Backup Best Practices

**Automate Backups**
- Schedule regular backups with cron, systemd timers, or cloud services
- Monitor backup success/failure
- Alert on backup failures
- Test backup automation regularly
- Document backup procedures

**Verify Backups**
- Test restore procedures regularly
- Verify backup integrity: Checksums, test restores
- Ensure backups are complete and not corrupted
- Schedule: Monthly or quarterly restore tests
- Benefits: Confidence in disaster recovery

**Offsite Storage**
- Store backups in different location from primary database
- Protects against: Site disasters, hardware failures
- Options: Cloud storage (S3, GCS, Azure Blob), remote servers
- Encrypt backups in transit and at rest
- Benefits: Disaster recovery, compliance

**Retention Policy**
- Define how long to keep backups
- Example: Daily for 7 days, weekly for 4 weeks, monthly for 12 months
- Balance: Storage costs vs recovery needs
- Compliance: Legal requirements for data retention
- Automate: Cleanup of old backups

**Backup Security**
- Encrypt backups to protect sensitive data
- Control access: Limit who can access backups
- Audit: Log backup access and restore operations
- Tools: GPG encryption, cloud encryption, backup tool encryption
- Benefits: Data protection, compliance

### Point-in-Time Recovery

**Transaction Log Archiving**
- Archive transaction logs for replay
- PostgreSQL: WAL archiving with `archive_command`
- MySQL: Binary log archiving
- Enables: Recovery to any point in time
- Storage: Keep logs for desired recovery window

**PITR Process**
- Restore base backup
- Replay transaction logs up to desired point
- Specify: Timestamp or transaction ID
- PostgreSQL: `recovery_target_time = '2024-01-15 14:30:00'`
- Use cases: Recover from accidental deletion, corruption

**Recovery Time Objective (RTO)**
- Maximum acceptable downtime
- Influences: Backup frequency, restore procedures
- Measure: Time to restore and verify database
- Plan: Procedures to meet RTO requirements
- Test: Regular restore drills

**Recovery Point Objective (RPO)**
- Maximum acceptable data loss
- Influences: Backup frequency, transaction log archiving
- Measure: Time between last backup and failure
- Plan: Backup strategy to meet RPO requirements
- Example: RPO of 1 hour requires at least hourly backups

### Disaster Recovery

**Disaster Recovery Plan**
- Document: Backup procedures, restore procedures, contact information
- Define: Disaster scenarios, recovery priorities
- Assign: Roles and responsibilities
- Test: Regular disaster recovery drills
- Update: Keep plan current with infrastructure changes

**High Availability Setup**
- Primary-replica replication for automatic failover
- Synchronous replication: Zero data loss
- Asynchronous replication: Better performance, potential data loss
- Tools: Streaming replication (PostgreSQL), replication (MySQL), replica sets (MongoDB)
- Benefits: Minimal downtime, automatic recovery

**Geographic Redundancy**
- Replicate to different geographic regions
- Protects against: Regional disasters, network failures
- Options: Multi-region replication, cross-region backups
- Trade-offs: Latency, cost, complexity
- Benefits: Business continuity, disaster recovery

**Failover Procedures**
- Automated: Automatic failover with monitoring tools
- Manual: Documented steps for manual failover
- Test: Regular failover drills
- Verify: Application connectivity, data consistency
- Rollback: Plan to revert if issues arise

**Data Center Failure**
- Plan for complete data center loss
- Requires: Offsite backups, geographic redundancy
- Test: Restore in different data center
- Document: Network configuration, DNS changes
- Coordinate: With infrastructure and application teams

### Backup Tools and Services

**Database-Native Tools**
- PostgreSQL: pg_dump, pg_basebackup, pg_restore
- MySQL: mysqldump, mysqlpump, MySQL Enterprise Backup
- MongoDB: mongodump, mongorestore, MongoDB Atlas backups
- Redis: RDB snapshots, AOF (Append-Only File)
- Benefits: Well-integrated, reliable, free

**Third-Party Backup Tools**
- Barman (PostgreSQL): Backup and recovery manager
- Percona XtraBackup (MySQL): Hot backup tool
- pgBackRest (PostgreSQL): Advanced backup and restore
- Benefits: Advanced features, better management
- Trade-offs: Additional complexity, potential cost

**Cloud Backup Services**
- AWS RDS automated backups, snapshots
- Google Cloud SQL automated backups
- Azure Database automated backups
- MongoDB Atlas continuous backups
- Benefits: Managed service, easy setup, reliable
- Trade-offs: Vendor lock-in, cost, less control

**Backup Monitoring**
- Monitor backup success/failure
- Track: Backup size, duration, storage usage
- Alert: On failures, size anomalies, missing backups
- Tools: Monitoring systems, backup tool logs, custom scripts
- Benefits: Early detection of issues, reliability

### Recovery Testing

**Regular Restore Tests**
- Schedule: Monthly or quarterly
- Process: Restore to test environment, verify data
- Measure: Restore time, data integrity
- Document: Issues, improvements
- Benefits: Confidence, procedure validation

**Partial Restore Tests**
- Test restoring specific tables or databases
- Verify: Selective restore capabilities
- Use cases: Recover specific data, investigate issues
- Tools: pg_restore with --table, MySQL with --tables

**Restore Time Measurement**
- Measure actual restore time for capacity planning
- Test with: Production-sized backups
- Consider: Network speed, disk I/O, database size
- Use: To validate RTO requirements
- Document: Baseline times, trends

**Disaster Recovery Drills**
- Simulate complete disaster scenario
- Test: Full recovery process, failover procedures
- Involve: All relevant teams
- Frequency: Annually or semi-annually
- Benefits: Team preparedness, procedure validation
