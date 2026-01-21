# Workflow Runs in Neo4j (Current State)

**As of:** 2026-01-21 12:00 UTC+8
**Commit:** 037fae675b3f2108e74eff40ab173a0ccb7e72f0

This documents the current state of how workflow runs are stored in Neo4j.

## Graph Structure

```mermaid
graph LR
    WR[WorkflowRun] -->|INITIATED_BY| U[User]
    WR -->|TRIGGERED_BY| WH[GithubWebhookEvent]
    WR -->|BASED_ON_ISSUE| I[Issue]
    WR -->|BASED_ON_REPOSITORY| R[Repository]
    WR -->|STARTS_WITH| E1[Event]
    E1 -->|NEXT| E2[Event]
    E2 -->|NEXT| E3[Event]
```

## Node Labels

| Label | Purpose |
| ------- | --------- |
| `WorkflowRun` | A single execution of a workflow |
| `Event` | Base label for all events in a workflow |
| `Message` | Additional label for LLM conversation events |
| `Plan` | Additional label for plan events |
| `User` | The user who initiated the workflow |
| `GithubWebhookEvent` | Webhook that triggered an automated workflow |
| `Issue` | GitHub issue the workflow operates on |
| `Repository` | GitHub repository context |

## Event Types (Neo4j Storage)

Events are stored with **camelCase** type names.

### Message Events

Events with both `:Event` and `:Message` labels:

| type | Description |
| ------ | ------------- |
| `systemPrompt` | Initial system instructions |
| `userMessage` | User input to the LLM |
| `llmResponse` | LLM response text |
| `toolCall` | LLM requesting a tool execution |
| `toolCallResult` | Result from a tool execution |
| `reasoning` | LLM reasoning/thinking |

### Workflow Events

Events with only `:Event` label:

| type | Description |
| ------- | ------------- |
| `status` | Status update message |
| `error` | Error that occurred |
| `workflowState` | State transition (pending, running, completed, error, timedOut) |
| `workflowStarted` | Workflow execution began |
| `workflowCompleted` | Workflow finished successfully |
| `workflowCancelled` | Workflow was cancelled |
| `workflowCheckpointSaved` | Checkpoint was saved |
| `workflowCheckpointRestored` | Checkpoint was restored |

### Plan Events

Events with `:Event`, `:Message`, and `:Plan` labels have additional properties: `status`, `version`, `editMessage`.

## Multi-Label Pattern

A single node can have multiple labels:

- `[:Event, :Message]` - Conversation events
- `[:Event, :Message, :Plan]` - Plan events

## Event Chain

Events form a linked list via `NEXT` relationships:

```cypher
(WorkflowRun)-[:STARTS_WITH]->(Event1)-[:NEXT]->(Event2)-[:NEXT]->(Event3)
```

## Naming Conventions

The codebase currently has two naming conventions for different layers:

| Layer | Convention | Example |
| --- | --- | --- |
| **Neo4j Storage** | camelCase | `workflowStarted`, `toolCall` |
| **Application Events** | dot-notation | `workflow.started`, `tool.call` |

Mappers in `shared/src/adapters/neo4j/queries/workflowRuns/` handle conversion between these formats.

## WorkflowRun Properties

| Property | Type | Required |
| ---------- | ------ | ---------- |
| `id` | string | Yes |
| `type` | enum | Yes |
| `createdAt` | DateTime | Yes |
| `state` | enum | No |
| `postToGithub` | boolean | No |

## Key Files

- **Schema definitions:** `shared/src/adapters/neo4j/types.ts`
- **DB-layer types:** `shared/src/lib/types/db/neo4j.ts`
- **Event mappers:** `shared/src/adapters/neo4j/queries/workflowRuns/*.mapper.ts`
- **Type conversion:** `shared/src/lib/neo4j/convert.ts`
