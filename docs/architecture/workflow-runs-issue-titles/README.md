## Workflow Runs: Issue Title Fetching Architecture

This document shows the flow for rendering issue titles in the workflow runs list, including runtime boundaries and dependency injection.

```mermaid
flowchart TB
  subgraph NextJS ["Next.js (Server Runtime)"]
    A["app/workflow-runs/page.tsx\nFunction: WorkflowRunsPage()\n- imports auth()\n- imports listWorkflowRuns()\n- imports listUserRepositories()\n- imports fetchIssueTitles(), GitHubGraphQLAdapter\n- RSC server component"]
    A --> B["getPermittedWorkflowRuns()\n- listWorkflowRuns()\n- listUserRepositories()\n- filters by permitted repos"]
    A --> C["auth() from '@/auth'\n- returns session with token"]
    A --> D["GitHubGraphQLAdapter(token)"]
    A --> E["fetchIssueTitles(port, refs)\n- service function"]
    A --> F["Table rows with Issue Title (#number)\n- links to GitHub"]
  end

  subgraph NodeShared ["Node (Shared Library)"]
    E --> G["GitHubIssuesPort interface\n(shared/src/core/ports/github.ts)"]
    D --> G
    E --> H["fetchIssueTitles()\n(shared/src/services/github/issues.ts)\n- dedup refs\n- port.getIssueTitles()\n- map back to input order"]
  end

  subgraph NodeAdapter ["Node (Adapter)"]
    D --> I["GitHub GraphQL API\nPOST /graphql\n- batch aliases\n- returns title, number, state"]
    D["GitHubGraphQLAdapter\n(shared/src/adapters/github-graphql.ts)\n- constructor(token, fetchImpl)\n- getIssueTitles(refs)"]
  end

  subgraph NodeNeo4j ["Node (Server Runtime)"]
    B --> J["listWorkflowRuns()\n(lib/neo4j/services/workflow.ts)\n- derive state\n- returns AppWorkflowRun & issue"]
    J --> K["lib/neo4j/repositories/workflowRun.ts\n- listAll/listForIssue"]
  end

  subgraph NodeGitHub ["Node (Server Runtime)"]
    B --> L["listUserRepositories()\n(lib/github/graphql/queries/listUserRepositories)"]
  end

  classDef runtime fill:#eef,stroke:#88a,stroke-width:1px
  classDef adapter fill:#efe,stroke:#8a8,stroke-width:1px
  classDef data fill:#fee,stroke:#a88,stroke-width:1px
  class NextJS runtime
  class NodeShared runtime
  class NodeAdapter adapter
  class NodeNeo4j runtime
  class NodeGitHub runtime
  class I data
```

### Notes

- Token injection occurs in `app/workflow-runs/page.tsx` via `auth()` and is passed to `GitHubGraphQLAdapter`.
- Shared services and ports are framework-agnostic and do not rely on Next.js.
- The adapter exposes a minimal fetch contract and can be provided any compatible fetch implementation.
