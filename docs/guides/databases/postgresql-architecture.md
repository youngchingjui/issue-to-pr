# PostgreSQL Architecture

## Overview

PostgreSQL serves as our primary relational database, handling structured data that doesn't require complex relationship mapping. It's particularly focused on user-related data and draft content storage.

## Data Models

### Users and Preferences

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    github_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    auto_publish_comments BOOLEAN DEFAULT false,
    auto_publish_prs BOOLEAN DEFAULT false,
    testing_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Draft Content

```sql
CREATE TABLE draft_content (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    workflow_run_id VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'comment' or 'pull_request'
    github_issue_id INTEGER NOT NULL,
    github_repo VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'discarded'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Key Features

1. **User Preferences Management**

   - Auto-publication settings for comments and PRs
   - Testing mode configuration
   - User-specific workflow preferences

2. **Draft Content Storage**

   - Temporary storage for AI-generated content
   - Support for both comments and pull requests
   - Metadata storage for additional context
   - Status tracking for content lifecycle

3. **Audit Trail**
   - Timestamp tracking for all records
   - Content status history
   - User action logging

## Integration Points

### With Neo4j

- Draft content references workflow runs stored in Neo4j
- User actions in PostgreSQL can trigger workflow state updates in Neo4j

### With Redis

- User preferences cached in Redis for quick access
- Draft content status updates broadcast via Redis for real-time UI updates

## Best Practices

1. **Data Access**

   - Use prepared statements for all queries
   - Implement connection pooling
   - Cache frequently accessed preferences in Redis

2. **Data Integrity**

   - Enforce foreign key constraints
   - Use transactions for multi-step operations
   - Implement soft deletes where appropriate

3. **Performance**
   - Index frequently queried columns
   - Regular VACUUM and maintenance
   - Monitor query performance

## Security Considerations

1. **Data Protection**

   - Encrypt sensitive data at rest
   - Implement row-level security where needed
   - Regular security audits

2. **Access Control**
   - Role-based access control
   - Minimal privilege principle
   - Regular permission reviews

## Monitoring and Maintenance

1. **Health Checks**

   - Connection pool status
   - Query performance metrics
   - Storage utilization

2. **Backup Strategy**
   - Regular full backups
   - Point-in-time recovery capability
   - Backup verification procedures
