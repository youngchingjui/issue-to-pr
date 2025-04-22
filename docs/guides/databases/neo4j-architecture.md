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

#### Repository

```cypher
CREATE (:Repository {
    // Immutable properties stored in Neo4j
    name: string,           // Repository name
    owner: string,         // Repository owner
    id: string,           // GitHub repository ID

    // Mutable properties fetched from GitHub API
    // - description
    // - defaultBranch
    // - settings
    // - visibility
})
```

#### Issue

```cypher
CREATE (:Issue {
    // Immutable properties stored in Neo4j
    number: integer,       // Issue number
    id: string,           // GitHub issue ID
    createdAt: datetime(), // Creation timestamp

    // Mutable properties fetched from GitHub API
    // - title
    // - body
    // - state
    // - labels
    // - assignees
    // - updatedAt
})
```

#### PullRequest

```cypher
CREATE (:PullRequest {
    // Immutable properties stored in Neo4j
    number: integer,      // PR number
    id: string,          // GitHub PR ID
    createdAt: datetime(), // Creation timestamp

    // Mutable properties fetched from GitHub API
    // - title
    // - body
    // - state
    // - branch
    // - reviewers
    // - labels
    // - mergeable
    // - updatedAt
})
```

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

```cypher
CREATE (:WorkflowRun {
    id: string,
    workflowType: string,    // e.g., "commentOnIssue", "createPR"
    startedAt: datetime(),
    completedAt: datetime(),
    status: string,          // running, completed, failed, etc.
    result: string,
    metadata: map           // Additional run-specific data
})
```

### 3. Execution Sequence Nodes

#### Message

Represents direct output or reasoning from an AI Agent.

```cypher
CREATE (:Message {
    id: string,
    content: string,      // The actual message content
    model: string,        // e.g., "gpt-4"
    timestamp: datetime(),
    metadata: map         // token usage, etc.
})
```

#### ToolCall

Represents a tool invocation requested by the AI Agent.

```cypher
CREATE (:ToolCall {
    id: string,
    toolName: string,     // e.g., "codebase_search"
    parameters: map,      // The parameters passed to the tool
    status: string,       // initiated, executing, completed, failed
    timestamp: datetime()
})
```

#### ToolResult

Represents the output returned from a tool execution.

```cypher
CREATE (:ToolResult {
    id: string,
    content: string | map,  // The tool's output
    isError: boolean,
    errorMessage: string,   // if error occurred
    timestamp: datetime()
})
```

#### Plan

Represents the final actionable output that requires review.

```cypher
CREATE (:Plan {
    id: string,
    status: string,      // pending_review, approved, rejected, implemented
    content: string,     // The actual plan content
    version: integer,
    originalVersion: boolean,
    createdAt: datetime(),
    updatedAt: datetime(),
    editedAt: datetime(),
    editedBy: string,
    editMessage: string,
    parentId: string     // Link to previous version if edited
})
```

### Core Relationships

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

// Execution Sequence Relationships
(:Message | :ToolCall | :ToolResult)-[:NEXT]->(:Message | :ToolCall | :ToolResult | :Plan)
(:Message | :ToolCall | :ToolResult | :Plan)-[:PART_OF]->(:WorkflowRun)
(:Message | :ToolCall)-[:EXECUTED_BY]->(:AIAgent)

// Tool Execution Flow
(:ToolCall)-[:HAS_RESULT]->(:ToolResult)
(:ToolResult)-[:RESULT_OF]->(:ToolCall)

// Plan Relationships
(:Message)-[:GENERATED_PLAN]->(:Plan)  // Links the final message to the plan
(:Plan)-[:PREVIOUS_VERSION]->(:Plan)   // For plan versions
(:User)-[:REVIEWS | :APPROVES | :REJECTS | :EDITS]->(:Plan)
(:Plan)-[:IMPLEMENTS]->(:Issue)
(:Plan)-[:RESULTS_IN]->(:PullRequest)
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
MATCH (call:ToolCall {id: $toolCallId})
MATCH (call)-[:HAS_RESULT]->(result:ToolResult)
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
