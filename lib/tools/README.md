# /lib/tools – LLM-callable function toolkit

This folder packages **reusable helper functions** as [OpenAI function-calling](https://platform.openai.com/docs/guides/function-calling) **tools** so that our LLM agents can interact with the local filesystem, Git, or remote APIs in a controlled manner.

Each file follows the same pattern:

1. **Define the input schema** with `zod` (e.g. `applyPatchToolParameters`).
2. **Implement a `handler`** that performs the side-effect (git commit, file write, etc.).
3. **Export `createXYZTool()`** – a factory returning an object that conforms to the `Tool` interface consumed by `Agent.addTool()`.

```ts
export const createCommitTool = (baseDir: string) =>
  createTool({
    name: "commit_changes",
    description: "Commit the changes to the repository…",
    schema: commitParameters,
    handler: (params) => fnHandler(baseDir, params),
  })
```

Guidelines & conventions:

- **One file ⇒ one tool** – keep them single-responsibility.
- **Read-only vs. mutating** – name & document the behaviour clearly.
- **Do not place generic utilities here.** If a function is useful outside an LLM context it should live elsewhere in `lib` and be _wrapped_ by a tool.
- **No transpilation magic.** Tools should work in a Node.js environment without relying on Next.js internals.

By keeping this contract stable we allow new agents to mix-and-match capabilities without duplicating implementation details.
