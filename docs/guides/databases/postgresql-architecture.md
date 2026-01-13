# PostgreSQL Architecture

## Overview

PostgreSQL serves as our primary relational database for user-centric data and GitHub App installation management. It stores immutable user identifiers while leveraging external services (GitHub, Stripe) as sources of truth for mutable data.

## Data Models

### Users

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    github_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE,  -- Links to Stripe for billing data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE github_app_installations (
    id SERIAL PRIMARY KEY,
    github_installation_id VARCHAR(255) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,  -- 'user' or 'organization'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_installations (
    user_id INTEGER REFERENCES users(id),
    installation_id INTEGER REFERENCES github_app_installations(id),
    permission_level VARCHAR(50) NOT NULL,  -- 'admin', 'write', 'read'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, installation_id)
);
```

### User Preferences and Settings

```sql
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    auto_publish_comments BOOLEAN DEFAULT false,
    auto_publish_prs BOOLEAN DEFAULT false,
    testing_mode BOOLEAN DEFAULT false,
    notification_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Draft Content

```sql
CREATE TABLE draft_content (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    workflow_run_id VARCHAR(255) NOT NULL,  -- References Neo4j WorkflowRun.id
    content_type VARCHAR(50) NOT NULL,      -- 'comment' or 'pull_request'
    github_issue_id INTEGER NOT NULL,
    github_repo VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(50) DEFAULT 'draft',     -- 'draft', 'published', 'discarded'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Integration with External Services

### GitHub Integration

- JWT-based authentication for user sessions
- GitHub API as source of truth for user profile data
- GitHub App Installation tracking for repository access

### Stripe Integration

- Stripe as source of truth for billing and subscription data
- Users linked to Stripe via `stripe_customer_id`
- Real-time subscription status and limits fetched from Stripe API

### Neo4j Integration

Our system uses a hybrid database approach where PostgreSQL and Neo4j complement each other:

1. **Data Synchronization**

   - User creation in PostgreSQL triggers creation of corresponding User node in Neo4j
   - Both databases use the same user IDs for consistency
   - GitHub App Installation changes sync to Neo4j for relationship mapping

2. **Cross-Database References**

   - Draft content references workflow runs by ID (stored in Neo4j)
   - Neo4j relationships reference PostgreSQL entities by ID
   - User actions in PostgreSQL can trigger workflow state updates in Neo4j

3. **Data Ownership**
   - PostgreSQL owns immutable user identifiers and installation data
   - Neo4j owns workflow data, message chains, and relationship graphs
   - External services (GitHub, Stripe) own mutable user data

## Key Features

1. **User Management**

   - GitHub user identification
   - Stripe customer linking
   - GitHub App Installation tracking
   - Permission level management

2. **User Preferences**

   - Workflow automation settings
   - Notification preferences
   - UI/UX preferences
   - Feature toggles

3. **Draft Content Storage**
   - Temporary storage for AI-generated content
   - Status tracking for content lifecycle
   - Links to Neo4j workflow data

## Security Considerations

1. **Authentication**

   - JWT-based authentication
   - Regular JWT rotation
   - Audit logging for sensitive operations

2. **Access Control**
   - Row-level security for multi-tenant data
   - Permission checks for installation access
   - Rate limiting per user

## Performance Optimization

1. **Indexing Strategy**

   ```sql
   CREATE INDEX idx_users_github_id ON users(github_id);
   CREATE INDEX idx_users_stripe_id ON users(stripe_customer_id);
   CREATE INDEX idx_installations_github_id ON github_app_installations(github_installation_id);
   CREATE INDEX idx_draft_content_workflow ON draft_content(workflow_run_id);
   ```

2. **Caching Strategy**

   - User preferences cached in Redis
   - Installation permissions cached
   - Stripe subscription data cached with TTL

3. **Query Optimization**
   - Prepared statements
   - Connection pooling
   - Regular VACUUM and maintenance
   - Query performance monitoring

## Monitoring and Maintenance

1. **Health Checks**

   - Connection pool status
   - Storage utilization
   - API integration status (GitHub, Stripe)

2. **Backup Strategy**
   - Regular full backups
   - Point-in-time recovery
   - Backup verification
   - Disaster recovery testing
