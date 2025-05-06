// Migration script to convert Workflow nodes to WorkflowRun nodes
// This script is idempotent and can be run multiple times safely

// Step-by-step migration script

// Step 1: Add WorkflowRun label to existing Workflow nodes (without removing Workflow label yet)
MATCH (w:Workflow)
WHERE w.metadata IS NOT NULL
SET w:WorkflowRun
REMOVE w:Workflow;

// Step 2: Add Message label to Event nodes (without removing Event label)
// TODO: Review if this is still necessary
MATCH (e:Event)
SET e:Message;

// Create [:NEXT] relationships between chain of events
MATCH (e1: Event )-[r:NEXT_EVENT]->(e2:Event)
CREATE (e1)-[r2:NEXT]->(e2)

// Create [:STARTS_WITH] relationships between WorkflowRuns and first Event
MATCH (w:WorkflowRun)-[r:BELONGS_TO_WORKFLOW]->(e:Event)
WHERE NOT ( (e)<-[:NEXT]-(:Event) )
CREATE (w)-[r2:STARTS_WITH]->(e)

// Set w.workflowType
MATCH (w:WorkflowRun)
WHERE w.metadata CONTAINS 'workflowType'
WITH w, apoc.convert.fromJsonMap(w.metadata) AS meta
WHERE meta.workflowType IS NOT NULL
SET w.workflowType = meta['workflowType']
RETURN w.id, w.workflowType 

// Find any Workflow Runs that don't have `createdAt` and do something about it, ie:
MATCH (w:WorkflowRun)
WHERE w.createdAt IS NULL AND w.created_at IS NOT NULL
SET w.createdAt = w.created_at
RETURN w

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
SET e.arguments = apoc.convert.toJson(data.arguments)
SET e.type = 'toolCall'
RETURN e

// Clean up toolCallResult
MATCH (e:Event {type: 'tool_response'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
SET e.content = data.response
SET e.toolName = data.toolName
SET e.type = 'toolCallResult'
RETURN e

// Clean up Status Messages
MATCH (e:Event {type: 'status'})
WITH e, apoc.convert.fromJsonMap(e.data) AS data
SET e.content = data.status
RETURN e

// Clean up errors messages
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


// Now, attach existing Plan nodes to their connected messages
MATCH (p: Plan)-[r:GENERATED_FROM]->(e:Event)
SET e:Plan
SET e.status = 'pendingReview'
SET e.version = 1
RETURN p, r, e


// Make sure all (:Plan) have [:IMPLEMENTS] relationship with (i:Issue)
// First, take stock take of how many plans there arguments

MATCH (p:Plan)
RETURN p

// Then, identify how they are currently connected to their issues

// Create the [:IMPLEMENTS] relationship once you find those Plan/Issue pairs
MATCH (p:Plan)-[r]-(i:Issue)
CREATE (p)-[r2:IMPLEMENTS]->(i)
RETURN p, r, i, r2

MATCH (p:Plan)-[r1]-(w:WorkflowRun)-[r2]-(i:Issue)
WHERE NOT (p)-[:IMPLEMENTS]-(i)
WITH p, i, w, r1, r2
CREATE (p)-[r3:IMPLEMENTS]->(i)
RETURN p, w, i, r1, r2, r3


// Ensure all Plans have a version
MATCH (p:Plan)
WHERE p.version IS NULL
SET p.version = 1

// Find any plans that don't have `createdAt` and do something about it, ie:
MATCH (p:Plan)
WHERE p.createdAt IS NULL AND p.timestamp IS NOT NULL
SET p.createdAt = p.timestamp
RETURN p

// After everything is working, you can slowly clean up unused and deprecated nodes, properties and relationships
Get rid of:
- [:BELONGS_TO_WORKFLOW]
- [:PART_OF]
- [:NEXT_EVENT]