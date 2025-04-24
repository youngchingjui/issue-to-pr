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

Key relationships:

```cypher
// GitHub-related
(:User)-[:HAS_ACCESS_TO]->(:GitHubAppInstallation)
(:User)-[:AUTHORIZED_FOR]->(:Repository)
(:User)-[:OWNS]->(:Repository)

// Content-related
(:User)-[:EDITED_BY]->(:Plan)
(:User)-[:REVIEWS|:APPROVES|:REJECTS]->(:Plan)
(:User)-[:AUTHORED]->(:Message {role: "user"})
```

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

```cypher
// Tool call message - see ToolCall type in neo4j.ts
MATCH (m:Message {role: "tool_call"})
WHERE m.metadata.toolName = $toolName
RETURN m

// Tool result message - see ToolResult type in neo4j.ts
MATCH (m:Message {role: "tool_result"})
WHERE m.metadata.toolName = $toolName
RETURN m

// Plan message - see Plan type in neo4j.ts
MATCH (m:Message:Plan)
WHERE m.role = "assistant"
RETURN m

// Review comment - see ReviewComment type in neo4j.ts
MATCH (m:Message:ReviewComment)
WHERE m.role = "user"
RETURN m
```

### Core Relationships

All relationship types are defined in the `RelationshipTypes` type in `neo4j.ts`. Here are the key relationships:

```cypher
// Repository Relationships
(:Repository)-[:HAS_ISSUES]->(:Issue)
(:Repository)-[:HAS_PRS]->(:PullRequest)
(:Repository)-[:OWNED_BY]->(:User)

// Issue Relationships
(:Issue)-[:BELONGS_TO]->(:Repository)
(:Issue)-[:CREATED_BY]->(:User)
(:Issue)-[:HAS_COMMENTS]->(:Comment)
(:Issue)-[:HAS_RUNS]->(:WorkflowRun)  // Direct relationship to WorkflowRun

// PullRequest Relationships
(:PullRequest)-[:RESOLVES]->(:Issue)
(:PullRequest)-[:BELONGS_TO]->(:Repository)
(:PullRequest)-[:CREATED_BY]->(:User)
(:PullRequest)-[:GENERATED_BY]->(:WorkflowRun)

// Message Relationships
(:Message)-[:NEXT]->(:Message)  // Sequential order in conversation
(:Message)-[:PART_OF]->(:WorkflowRun)  // Belongs to workflow
(:Message)-[:COMMENTS_ON]->(:Message)  // For review comments on plans

// Versioning and Plan Relationships
(:Plan)-[:PREVIOUS_VERSION]->(:Plan)         // Links plan versions
(:Plan)-[:EDITED_BY]->(:User)                // Indicates which user edited a plan
(:User)-[:REVIEWS|:APPROVES|:REJECTS]->(:Message:Plan) // User actions on plans
(:Message:Plan)-[:IMPLEMENTS]->(:Issue)
(:Message:Plan)-[:RESULTS_IN]->(:PullRequest)
```

## Common Queries

### Get All Runs for a Specific Workflow Type

```cypher
MATCH (run:WorkflowRun {workflowType: $workflowType})
RETURN run
ORDER BY run.startedAt DESC
```

### Get Latest Runs for an Issue

```cypher
MATCH (i:Issue {number: $issueNumber})-[:HAS_RUNS]->(run:WorkflowRun)
RETURN run.workflowType, run.status, run.startedAt, run.completedAt
ORDER BY run.startedAt DESC
LIMIT 5
```

### Get Full Workflow Path

```cypher
MATCH (startNode) WHERE id(startNode) = $startNodeId
MATCH path = (startNode)-[:NEXT*0..]->(endNode)
WHERE NOT (endNode)-[:NEXT]->()  // Find the end of the path
RETURN path
```

### Get Complete Sequence for a WorkflowRun

```cypher
MATCH (run:WorkflowRun {id: $workflowRunId})
MATCH (node)-[:PART_OF]->(run)
RETURN node.id,
       labels(node)[0] as type,  // Message, ToolCall, ToolResult, or Plan
       node.timestamp,
       CASE
         WHEN 'Message' IN labels(node) THEN node.content
         WHEN 'ToolCall' IN labels(node) THEN node.toolName
         WHEN 'ToolResult' IN labels(node) THEN node.content
         WHEN 'Plan' IN labels(node) THEN 'Plan: ' + node.status
       END as content
ORDER BY node.timestamp
```

### Get Tool Call with its Result

```cypher
MATCH (call:Message {role: "tool_call"})-[:NEXT]->(result:Message {role: "tool_result"})
WHERE call.metadata.toolName = $toolName
RETURN call, result
```

### Get Plan Review History

```cypher
MATCH (plan:Plan {id: $planId})
MATCH (user:User)-[review:REVIEWS|APPROVES|REJECTS|EDITS]->(plan)
RETURN user.name, type(review) as action, review.timestamp
ORDER BY review.timestamp DESC
```

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

Example multi-label queries:

```cypher
// Find all assistant messages that are plans
MATCH (m:Message:Plan)
WHERE m.role = 'assistant'
RETURN m
ORDER BY m.timestamp

// Get plan version history
MATCH (m:Message:Plan {id: $planId})
MATCH path = (m)-[:PREVIOUS_VERSION*0..]->(prev:Message:Plan)
RETURN path

// Find user review comments on plans
MATCH (p:Message:Plan)<-[:COMMENTS_ON]-(c:Message:ReviewComment)
WHERE c.role = 'user'
RETURN p, c
ORDER BY c.timestamp
```

### Message Chains and Conversation Context

Messages can be organized into chains for conversation context while maintaining their other roles through labels and relationships. All message types are defined in `neo4j.ts`.

#### Chain Relationships

All relationship types are defined in the `RelationshipTypes` type in `neo4j.ts`:

```cypher
// Sequential message chain
(:Message)-[:NEXT]->(:Message)

// Workflow context
(:Message)-[:PART_OF]->(:WorkflowRun)

// Response relationships
(:Message)-[:RESPONDS_TO]->(:Message)

// Context relationships
(:Message)-[:REFERENCES]->(:Issue)
(:Message)-[:COMMENTS_ON]->(:Plan)
(:Message)-[:SUGGESTS_EDIT_TO]->(:Plan)
```

#### Common Chain Queries

```cypher
// Get complete conversation chain including tool calls
MATCH (w:WorkflowRun {id: $workflowId})
MATCH (m:Message)-[:PART_OF]->(w)
RETURN m.role, m.content, m.metadata
ORDER BY m.timestamp

// Get tool call with its result
MATCH (call:Message {role: "tool_call"})-[:NEXT]->(result:Message {role: "tool_result"})
WHERE call.metadata.toolName = $toolName
RETURN call, result

// Get conversation without tool calls (just user and assistant messages)
MATCH (w:WorkflowRun {id: $workflowId})
MATCH (m:Message)-[:PART_OF]->(w)
WHERE m.role IN ["user", "assistant", "system"]
RETURN m.role, m.content
ORDER BY m.timestamp

// Get plan version history (from latest to original)
MATCH (latest:Plan)
WHERE latest.id = $planId
MATCH path = (latest)-[:PREVIOUS_VERSION*0..]->(original:Message:Plan)
WHERE original.originalVersion = true
RETURN path

// Find latest version of a plan
MATCH (p:Plan)
WHERE p.id = $planId
AND NOT (:Plan)-[:PREVIOUS_VERSION]->(p)
RETURN p

// Find all plans edited by a specific user
MATCH (u:User {id: $userId})<-[:EDITED_BY]-(p:Plan)
RETURN p
ORDER BY p.timestamp DESC

// Find the user who edited a specific plan version
MATCH (p:Plan {id: $planVersionId})-[:EDITED_BY]->(u:User)
RETURN u

// Find original AI-generated plans
MATCH (p:Message:Plan)
WHERE p.role = 'assistant' AND p.originalVersion = true
RETURN p
ORDER BY p.timestamp DESC
```

#### Chain Management

1. **Adding to Chain**

   ```cypher
   // Add new message to conversation
   MATCH (prev:Message {id: $prevMessageId})
   MATCH (new:Message {id: $newMessageId})
   CREATE (prev)-[:NEXT]->(new)
   ```

2. **Creating Review Thread**

   ```cypher
   // Add review comment
   MATCH (p:Message:Plan {id: $planId})
   MATCH (m:Message:ReviewComment {id: $commentId})
   CREATE (m)-[:COMMENTS_ON]->(p)
   ```

3. **Version Management**
   ```cypher
   // Create new version of plan
   MATCH (original:Message:Plan {id: $originalPlanId})
   CREATE (new:Message:Plan {
       id: $newId,
       content: $newContent,
       version: original.version + 1,
       originalVersion: false,
       editedAt: datetime(),
       editedBy: $userId
   })
   CREATE (new)-[:PREVIOUS_VERSION]->(original)
   ```

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

Example queries involving users:

```cypher
// Find all plans reviewed by a specific user
MATCH (u:User {id: $userId})-[:REVIEWS]->(p:Plan)
RETURN p
ORDER BY p.timestamp DESC

// Find all repositories a user has access to
MATCH (u:User {id: $userId})-[:HAS_ACCESS_TO]->(install:GitHubAppInstallation)
MATCH (install)-[:INSTALLED_ON]->(repo:Repository)
RETURN repo

// Find users who have edited high-impact plans
MATCH (u:User)<-[:EDITED_BY]-(p:Plan)
WHERE p.status = 'implemented'
RETURN DISTINCT u.displayName, COUNT(p) as editCount
ORDER BY editCount DESC

// Find collaboration patterns between users
MATCH (u1:User)<-[:EDITED_BY]-(p:Plan)<-[:REVIEWS]-(u2:User)
WHERE u1 <> u2
RETURN u1.displayName, u2.displayName, COUNT(p) as collaborationCount
ORDER BY collaborationCount DESC
```
