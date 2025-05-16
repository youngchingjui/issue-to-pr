// Migration script to convert Workflow nodes to WorkflowRun nodes
// This script is idempotent and can be run multiple times safely

// Step-by-step migration script

// Step 1: Add WorkflowRun label to existing Workflow nodes (without removing Workflow label yet)
MATCH (w:Workflow)
WHERE w.metadata IS NOT NULL
SET w:WorkflowRun
REMOVE w:Workflow;

// Step 2: Add Message label to SystemMessage, UserMessage, LLMResponse, ToolCall, ToolCallResponse Event nodes (without removing Event label)
// TODO: Review

// Create [:NEXT] relationships between chain of events
MATCH (e1: Event )-[r:NEXT_EVENT]->(e2:Event)
MERGE (e1)-[r2:NEXT]->(e2)
DELETE r
RETURN e1, e2, r2

// Create [:STARTS_WITH] relationships between WorkflowRuns and first Event
MATCH (w:WorkflowRun)-[r:BELONGS_TO_WORKFLOW]->(e:Event)
WHERE NOT ( (e)<-[:NEXT]-(:Event) )
CREATE (w)-[r2:STARTS_WITH]->(e)

// Set w.type. If w.metadata.workflowType is NULL, set as 'commentOnIssue'
MATCH (w:WorkflowRun)
WITH w, apoc.convert.fromJsonMap(w.metadata) AS meta
SET w.type = COALESCE(meta.workflowType, 'commentOnIssue')
RETURN w, w.type

// Convert w.type from "resolve_issue" to "resolveIssue" (if exists)
MATCH (w:WorkflowRun {type: 'resolve_issue'})
SET w.type = 'resolveIssue'
RETURN w, w.type

// Find any Workflow Runs that don't have `createdAt` and do something about it, ie:
MATCH (w:WorkflowRun)
WHERE w.createdAt IS NULL AND w.created_at IS NOT NULL
SET w.createdAt = w.created_at
RETURN w

// EVENTS

// Use this to get an overview of current event nodes
MATCH (e:Event)
RETURN e.type, labels(e), COUNT(\*)

// Set .createdAt property for (:Event) nodes
MATCH (e:Event)
WHERE e.timestamp IS NOT NULL
SET e.createdAt = e.timestamp
RETURN e

// Clean up systemPrompt
MATCH (e:Event {type: 'system_prompt'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
SET e.content = data.content
SET e.type = 'systemPrompt'
RETURN e

// Clean up userMessage
MATCH (e:Event {type: 'user_message'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
SET e.content = data.content
SET e.type = 'userMessage'
RETURN e

// Clean up llmResponse
MATCH (e:Event {type: 'llm_response'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
WHERE data IS NOT NULL
SET e.content = data.content
SET e.model = data.model
SET e.type = 'llmResponse'
RETURN e

// Clean up toolCall
MATCH (e:Event {type: 'tool_call'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
SET e.toolName = data.toolName
SET e.args = apoc.convert.toJson(data.arguments)
SET e.type = 'toolCall'
RETURN e

// If (e:Event {type: 'toolCall'}) doesn't have .toolCallId, just set it as .id. This is saved properly moving forward
MATCH (e:Event {type: 'toolCall'})
WHERE e.toolCallId IS NULL
SET e.toolCallId = e.id
RETURN e.toolCallId

// Clean up toolCallResult
MATCH (e:Event {type: 'tool_response'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
SET e.content = data.response
SET e.toolName = data.toolName
SET e.type = 'toolCallResult'
RETURN e

// If (e:Event {type: 'toolCallResult'}) doesn't have .toolCallId, just set it as .id. This is saved properly moving forward
MATCH (e:Event {type: 'toolCallResult'})
WHERE e.toolCallId IS NULL
SET e.toolCallId = e.id
RETURN e.id

// Clean up Status Messages
MATCH (e:Event {type: 'status'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
SET e.content = data.status
RETURN e

// Clean up errors messages

```cypher
MATCH (e:Event {type: 'error'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
WITH e, data.error AS errorVal
WITH e,
    CASE
        WHEN apoc.meta.cypher.type(errorVal) = 'MAP' THEN apoc.convert.toJson(errorVal)
        ELSE errorVal
    END AS errorString
SET e.content = errorString
RETURN e, errorString
```

// Now, attach existing Plan nodes to their connected messages
MATCH (p: Plan)-[r:GENERATED_FROM]->(e:Event)
SET e:Plan
SET e.status = 'draft'
SET e.version = 1
RETURN p, r, e

// Make sure all (:Plan) have [:IMPLEMENTS] relationship with (i:Issue)
// First, take stock take of how many plans there arguments

MATCH (p:Plan)
RETURN p

// Then, identify how they are currently connected to their issues

// Create the [:IMPLEMENTS] relationship once you find those Plan/Issue pairs
MATCH (i:Issue)-[r1:HAS_PLAN]->(p:Plan)-[r2:GENERATED_FROM]->(e:Event)
MERGE (e)-[r3:IMPLEMENTS]->(i)
RETURN i, p, e, r1, r2, r3

// OR
MATCH (p:Plan)-[r1]-(w:WorkflowRun)-[r2]-(i:Issue)
WHERE NOT (p)-[:IMPLEMENTS]-(i)
WITH p, i, w, r1, r2
CREATE (p)-[r3:IMPLEMENTS]->(i)
RETURN p, w, i, r1, r2, r3

// Remove the old-school single Plan that was (p:Plan)-[:GENERATED_FROM]->(e:Event)
MATCH (p:Plan)
WHERE NOT p:Event
DETACH DELETE p

// Ensure all Plans have a version
MATCH (p:Plan)
WHERE p.version IS NULL
SET p.version = 1

// Find any plans that don't have `createdAt` and do something about it, ie:
MATCH (p:Plan)
WHERE p.createdAt IS NULL AND p.timestamp IS NOT NULL
SET p.createdAt = p.timestamp
RETURN p

// Convert (i:Issue).id to Integers. Currently, they are floats.
MATCH (i:Issue)
SET i.number = toInteger(i.number)
RETURN i, i.number, apoc.meta.cypher.type(i.number)

// Delete redundant [:NEXT_EVENT] relationship between (e:Event) nodes
MATCH (e1:Event)-[r1:NEXT]->(e2:Event)
MATCH (e1)-[r2:NEXT_EVENT]->(e2)
DELETE r2

// Delete unusued [:BELONGS_TO_WORKFLOW] and [:PART_OF] relationship between (w:WorkflowRun) and (e:Event)
MATCH (w:WorkflowRun)-[r:BELONGS_TO_WORKFLOW]-(e:Event)
WITH w, r, e
MATCH (e)-[r2:NEXT|STARTS_WITH]-()
DELETE r
RETURN w, e, r2

MATCH (w:WorkflowRun)-[r:PART_OF]-(e:Event)
WITH w, r, e
MATCH (e)-[r2:NEXT|STARTS_WITH]-()
DELETE r
RETURN w, e, r2

// Convert e.type = 'complete' events to e.type = 'workflowState'
MATCH (e:Event { type: 'complete'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
SET e.content = data.content
SET e.type = 'workflowState'
SET e.state = 'completed'
RETURN e

// Convert e.type = 'workflow_start' to e.type = 'workflowState'
MATCH (e:Event { type: 'workflow_start'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
SET e.content = data.content
SET e.type = 'workflowState'
SET e.state = 'running'
RETURN e

// Remove 'Message' label from events that shouldn't have them:

- workflowState
- error
- status

MATCH (e:Event:Message {type: 'error'})
REMOVE e:Message
RETURN e

MATCH (e:Event:Message {type: 'status'})
REMOVE e:Message
RETURN e

MATCH (e:Event:Message {type: 'workflowState'})
REMOVE e:Message
RETURN e
