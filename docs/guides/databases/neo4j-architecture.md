# Neo4j Architecture

## Overview

This document details the Neo4j-specific implementation of our workflow storage system. Neo4j serves as our primary database for storing and querying workflow structures, relationships, and decision paths.

## Why Neo4j?

1. **Native Graph Structure**

   - Perfect for parent-child relationships
   - Efficient traversal queries
   - Natural representation of workflow branches
   - Built-in support for relationship types

2. **Query Performance**

   - Optimized for relationship traversal
   - Efficient path finding
   - Built-in graph algorithms

3. **Cross-Branch Monitoring**
   - Native support for complex relationships
   - Efficient branch relationship queries
   - Clear visualization capabilities

## Data Model

### 1. Core Entities (Primary Nodes)

Our core entities are defined in `lib/types/neo4j.ts`. Below are the key nodes and their relationships. For detailed type definitions, please refer to the TypeScript interfaces.

#### User

Users in Neo4j primarily serve as connection points for relationships in the graph, while detailed user data is stored in PostgreSQL. See `User` type in `neo4j.ts`.

Note: Core user data (OAuth config, subscription status, preferences) is stored in PostgreSQL. The Neo4j User node serves primarily as an anchor point for graph relationships.

#### Repository

See `Repository` type in `neo4j.ts` for full property definitions.

#### Issue

See `Issue` type in `neo4j.ts` for full property definitions.

#### PullRequest

See `PullRequest` type in `neo4j.ts` for full property definitions.

### Helper Functions

To work with mutable GitHub data, use these Cypher functions that fetch live data:

```cypher
// Get full issue details including mutable properties
CALL github.getIssue(owner, repo, number) YIELD *

// Get full PR details including mutable properties
CALL github.getPullRequest(owner, repo, number) YIELD *

// Get full repository details including mutable properties
CALL github.getRepository(owner, name) YIELD *
```

### Example Queries

```cypher
// Get issue with live GitHub data
MATCH (i:Issue {number: $issueNumber})-[:BELONGS_TO]->(r:Repository)
CALL github.getIssue(r.owner, r.name, i.number) YIELD title, body, state, labels
RETURN i.number, title, body, state, labels

// Get PR with live GitHub data
MATCH (pr:PullRequest {number: $prNumber})-[:BELONGS_TO]->(r:Repository)
CALL github.getPullRequest(r.owner, r.name, pr.number) YIELD title, state, mergeable
RETURN pr.number, title, state, mergeable

// Get repository with live GitHub data
MATCH (r:Repository {name: $repoName, owner: $owner})
CALL github.getRepository(r.owner, r.name) YIELD description, defaultBranch, visibility
RETURN r.name, description, defaultBranch, visibility
```

### 2. Workflow Management (Process Nodes)

#### WorkflowRun

See `WorkflowRun` type in `neo4j.ts` for full property definitions.

### 3. Execution Sequence Nodes

#### Message

Messages in our system represent all types of communication and content. Each message has a role that defines its source and purpose. See `BaseMessage` type and its extensions (`ToolCall`, `ToolResult`, `Plan`, `ReviewComment`) in `neo4j.ts`.

The `role` property (defined by `MessageRole` type) indicates the source and purpose of the message:

- `"user"` - Messages from users (inputs, comments, edit suggestions)
- `"system"` - System prompts and instructions
- `"assistant"` - Responses from AI models
- `"tool_call"` - Tool invocations requested by the assistant
- `"tool_result"` - Results returned from tool executions

Messages can have additional labels to indicate special purposes:

- `:Plan` - Final actionable outputs that require review/approval
- `:ReviewComment` - Comment from user about a Plan

Example message types:

### Core Relationships

All relationship types are defined in the `RelationshipTypes` type in `neo4j.ts`. Here are the key relationships:

## Performance Considerations

1. **Indexing**

   - Create indexes on frequently queried properties (id, timestamp)
   - Use composite indexes for complex queries
   - Consider relationship indexes for heavy traversals

2. **Query Optimization**

   - Use parameterized queries
   - Leverage EXPLAIN and PROFILE for query tuning
   - Consider query caching for frequent patterns

3. **Scaling**
   - Monitor node and relationship growth
   - Implement data archival strategies
   - Consider read replicas for heavy query loads

## Integration with Other Services

### With Redis

- Events are first published to Redis for real-time updates
- Background job synchronizes Redis and Neo4j states
- Workflow state changes are reflected in both systems

### With PostgreSQL

- Draft content references workflow runs stored in Neo4j
- User actions in PostgreSQL can trigger workflow state updates in Neo4j

### With GitHub API

- Mutable properties are fetched in real-time from GitHub API
- Only immutable identifiers and timestamps are stored in Neo4j
- Custom Cypher procedures wrap GitHub API calls
- Consider implementing caching layer for frequently accessed data
- Use webhooks to trigger workflow updates on GitHub events

### Multi-Label Nodes

Some nodes in our system can have multiple labels to represent their different purposes. This approach provides several benefits:

1. **Reduced Data Duplication**

   - Core message properties stored once
   - Additional labels add context without duplicating data
   - Simpler data model maintenance

2. **Clear Audit Trail**

   - Version history preserved through relationships
   - Actions and changes tracked with timestamps
   - User attribution maintained

3. **Flexible Querying**
   - Filter by role and/or labels for targeted queries
   - Combine labels for complex role combinations
   - Efficient indexing on frequently queried properties

### Message Chains and Conversation Context

Messages can be organized into chains for conversation context while maintaining their other roles through labels and relationships. All message types are defined in `neo4j.ts`.

#### Chain Relationships

All relationship types are defined in the `RelationshipTypes` type in `neo4j.ts`:

### Integration with PostgreSQL

Our system uses a hybrid database approach where:

1. **PostgreSQL stores:**

   - User profiles and authentication
   - OAuth configurations
   - Subscription status and billing
   - User preferences
   - Draft content

2. **Neo4j stores:**

   - Graph relationships (user actions, permissions, ownership)
   - Workflow data and message chains
   - Plans and their version history
   - Repository relationships

3. **Synchronization:**
   - User nodes in Neo4j are created/updated when corresponding PostgreSQL users are modified
   - Both databases use the same user IDs for consistency
   - Relationships in Neo4j reference PostgreSQL entities by ID
