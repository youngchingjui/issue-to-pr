```mermaid
sequenceDiagram
    box Browser Runtime
        participant Client as React Client
    end

    box Edge Runtime
        participant SSE as SSE Endpoint
        participant API as API Layer
    end

    box Node.js Runtime
        participant Workflow as Workflow Engine
        participant Background as Background Jobs
    end

    box Databases
        participant Redis as Redis
        participant Neo4j as Neo4j
        participant History as Redis History
    end

    Client->>API: 1. Start workflow
    activate Workflow

    API->>Workflow: 2. Initialize workflow
    Workflow->>Redis: 3. Set initial state
    Workflow->>Neo4j: 4. Create workflow node

    Client->>SSE: 5. Connect to SSE endpoint
    activate SSE

    SSE->>History: 6. Fetch missed events
    History-->>SSE: 7. Return event history
    SSE->>Client: 8. Replay missed events

    loop Event Generation
        Workflow->>Redis: 9a. Publish event
        Workflow->>History: 9b. Store in history
        Redis->>SSE: 10. Forward event
        SSE->>Client: 11. Stream to client

        par Background Persistence
            Background->>Redis: 12a. Read from queue
            Background->>Neo4j: 12b. Persist event
            Background->>Redis: 12c. Update status
        end
    end

    alt Error Occurs
        Workflow->>Redis: E1. Publish error
        Workflow->>Neo4j: E2. Log error
        Redis->>SSE: E3. Forward error
        SSE->>Client: E4. Handle error
    end

    Workflow->>Redis: 13. Mark complete
    Workflow->>Neo4j: 14. Update final state
    Redis->>SSE: 15. Send completion
    SSE->>Client: 16. Close stream
    deactivate Workflow

    Client->>SSE: 17. Close connection
    SSE->>Redis: 18. Cleanup resources
    deactivate SSE

    note over Neo4j: Persistent Graph Storage
    note over Redis: Real-time State & Events
```
