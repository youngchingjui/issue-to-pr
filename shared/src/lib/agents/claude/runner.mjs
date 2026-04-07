/**
 * Claude Agent SDK runner script.
 *
 * This script runs INSIDE the agent-base Docker container. It imports the
 * Claude Agent SDK (globally installed in the image), calls `query()`, and
 * writes structured NDJSON events to stdout for the worker process to collect.
 *
 * Input:  JSON on stdin (see RunnerInput below)
 * Output: NDJSON to stdout (see event types below)
 *
 * Environment variables consumed:
 *   ANTHROPIC_API_KEY  — picked up automatically by the SDK
 *   GITHUB_TOKEN       — used by the custom MCP tools for GitHub API calls
 */

import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk"
import { execSync } from "child_process"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write a single NDJSON event to stdout. */
function emit(event) {
  process.stdout.write(JSON.stringify(event) + "\n")
}

/** Read all of stdin as a string. */
async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString("utf-8")
}

/**
 * Make an authenticated GitHub REST API request.
 * Uses GITHUB_TOKEN from the environment.
 */
async function ghFetch(path, options = {}) {
  const token = process.env.GITHUB_TOKEN
  const url = path.startsWith("https://")
    ? path
    : `https://api.github.com${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  if (!res.ok) {
    throw new Error(
      `GitHub API ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`
    )
  }
  return data
}

// ---------------------------------------------------------------------------
// Custom MCP tools
// ---------------------------------------------------------------------------

function createGitHubTools(input) {
  const { repoFullName, defaultBranch, issueNumber } = input
  const [owner, repo] = repoFullName.split("/")

  const syncBranchTool = tool(
    "sync_branch_to_remote",
    "Pushes the current branch and its commits to the remote GitHub repository. Will create the remote branch if it doesn't exist.",
    { branch: z.string().describe("The name of the branch to push") },
    async ({ branch }) => {
      try {
        // Check if branch exists on remote
        let branchExists = false
        try {
          await ghFetch(`/repos/${owner}/${repo}/branches/${branch}`)
          branchExists = true
        } catch {
          // Branch doesn't exist yet
        }

        if (!branchExists) {
          // Get default branch HEAD SHA to create branch from
          const defaultRef = await ghFetch(
            `/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`
          )
          const sha = defaultRef.object.sha

          await ghFetch(`/repos/${owner}/${repo}/git/refs`, {
            method: "POST",
            body: JSON.stringify({
              ref: `refs/heads/${branch}`,
              sha,
            }),
          })
        }

        // Set authenticated remote URL and push
        const token = process.env.GITHUB_TOKEN
        const authenticatedUrl = `https://x-access-token:${token}@github.com/${repoFullName}.git`
        execSync(`git remote set-url origin "${authenticatedUrl}"`, {
          stdio: "pipe",
        })
        execSync(`git push origin ${branch}`, { stdio: "pipe" })

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "success",
                message: `Successfully pushed branch '${branch}' to remote`,
              }),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: `Failed to push branch: ${error.message}`,
              }),
            },
          ],
        }
      }
    }
  )

  const createPRTool = tool(
    "create_pull_request",
    "Creates a pull request from an existing remote branch. The branch must already be pushed to GitHub. Automatically links the originating issue and adds an 'AI generated' label.",
    {
      branch: z
        .string()
        .describe("The branch name to create the pull request from"),
      title: z.string().describe("The title of the pull request"),
      body: z.string().describe("The body/description of the pull request"),
    },
    async ({ branch, title, body }) => {
      try {
        // Check if PR already exists on this branch
        const existingPRs = await ghFetch(
          `/repos/${owner}/${repo}/pulls?head=${owner}:${branch}&state=open`
        )
        if (existingPRs.length > 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "error",
                  message: `A pull request already exists for branch '${branch}'. PR: ${existingPRs[0].html_url}`,
                }),
              },
            ],
          }
        }

        // Append issue reference to body
        const fullBody =
          issueNumber != null ? `${body}\n\nCloses #${issueNumber}` : body

        // Create PR
        const pr = await ghFetch(`/repos/${owner}/${repo}/pulls`, {
          method: "POST",
          body: JSON.stringify({
            head: branch,
            base: defaultBranch,
            title,
            body: fullBody,
          }),
        })

        // Add "AI generated" label (best-effort)
        try {
          await ghFetch(`/repos/${owner}/${repo}/issues/${pr.number}/labels`, {
            method: "POST",
            body: JSON.stringify({ labels: ["AI generated"] }),
          })
        } catch {
          // Label may not exist — not a critical failure
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "success",
                pullRequest: {
                  number: pr.number,
                  url: pr.html_url,
                  title: pr.title,
                },
              }),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: `Failed to create pull request: ${error.message}`,
              }),
            },
          ],
        }
      }
    }
  )

  return [syncBranchTool, createPRTool]
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a senior software engineer tasked with fully resolving GitHub issues.
First, analyze the issue thoroughly and brainstorm a few possible solutions. After reflecting, choose the best approach.
Then implement the necessary code changes using your available tools.
Refer to codebase configuration files to best understand coding styles, conventions, code structure and organization.
Prepare code changes and a PR that you think has the highest chance of being approved.
Also generally it'll mean the code changes should be small and focused, and exist squarely within the scope of the issue.

PRIMARY GOAL: Ensure any code you write passes all repository-defined linting/code-quality checks before opening the PR.
- Detect the appropriate linting commands from the repository context (language and tooling agnostic).
- Investigate configuration files and workflows to determine what to run, for example:
  - JavaScript/TypeScript: package.json scripts (e.g. "lint", "check", "lint:eslint", "lint:tsc", "prettier"), .eslintrc*, .prettierrc*, tsconfig*.json
  - Python: pyproject.toml (ruff/black/isort/mypy), requirements*.txt, setup.cfg, tox.ini
  - Go: golangci-lint config, go.mod, go vet, go fmt -l, staticcheck
  - Rust: Cargo.toml (cargo fmt -- --check, cargo clippy -D warnings)
  - Java/Kotlin: Gradle/Maven tasks like spotlessCheck/checkstyle (avoid running tests/builds if not strictly lint)
  - Other languages: prefer repo-provided Makefile targets or scripts named lint/check/format:check
- Choose the correct package manager/runner based on lockfiles:
  - pnpm-lock.yaml -> pnpm; yarn.lock -> yarn; package-lock.json -> npm
- If the environment needs dependencies, install them first (e.g. pnpm i, yarn, npm i, pip install -r requirements.txt, poetry install).
- Run read-only checks (no --fix/--write). Prefer project scripts (e.g. "pnpm run lint" or "pnpm run check:all").
- If linting fails, update your code and run checks again until they pass.
- Only when lint checks pass should you proceed to sync the branch and create the PR.

IMPORTANT: Before you finish, YOU MUST create a pull request by calling the create_pull_request tool. Do NOT end the conversation until this tool has been successfully invoked.
`

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Read input from stdin
  const rawInput = await readStdin()
  const input = JSON.parse(rawInput)

  const { issueTitle, issueBody, issueComments, directoryTree, workingBranch } =
    input

  // Build user message
  const parts = [
    `Github issue title: ${issueTitle}`,
    `Github issue description: ${issueBody}`,
  ]

  if (issueComments && issueComments.length > 0) {
    const commentText = issueComments
      .map(
        (c) =>
          `\n- **User**: ${c.user}\n- **Created At**: ${c.createdAt}\n- **Comment**: ${c.body}`
      )
      .join("\n")
    parts.push(`Github issue comments:\n${commentText}`)
  }

  if (directoryTree && directoryTree.length > 0) {
    parts.push(
      `Here is the codebase's tree directory:\n${directoryTree.join("\n")}`
    )
  }

  parts.push(`\nYou are working on branch: ${workingBranch}`)

  const userMessage = parts.join("\n\n")

  // Create MCP server with GitHub tools
  const githubTools = createGitHubTools(input)
  const mcpServer = createSdkMcpServer({
    name: "github-tools",
    tools: githubTools,
  })

  emit({ type: "status", content: "Starting Claude agent" })

  // Track tool call IDs to tool names so we can label results correctly
  const toolCallNames = new Map()

  try {
    for await (const message of query({
      prompt: userMessage,
      options: {
        cwd: "/workspace",
        systemPrompt: SYSTEM_PROMPT,
        allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        mcpServers: { "github-tools": mcpServer },
        maxTurns: 200,
      },
    })) {
      if (message.type === "result") {
        // Final result message — includes usage and cost data
        const resultEvent = {
          type: "result",
          content: message.subtype === "success" ? message.result : undefined,
          subtype: message.subtype,
          usage: message.usage,
          totalCostUsd: message.total_cost_usd,
          numTurns: message.num_turns,
          durationMs: message.duration_ms,
          sessionId: message.session_id,
          modelUsage: message.modelUsage,
        }
        if (message.subtype !== "success" && message.errors) {
          resultEvent.errors = message.errors
        }
        emit(resultEvent)
      } else if (message.type === "assistant") {
        // Assistant message — contains text and tool_use content blocks
        const contentBlocks = message.message?.content ?? []
        for (const block of contentBlocks) {
          if (block.type === "text" && block.text) {
            emit({ type: "llmResponse", content: block.text })
          } else if (block.type === "tool_use") {
            toolCallNames.set(block.id, block.name)
            emit({
              type: "toolCall",
              toolName: block.name,
              toolCallId: block.id,
              args: JSON.stringify(block.input),
            })
          }
        }
      } else if (message.type === "user") {
        // User messages carry tool results — either via tool_use_result (SDK field)
        // or via message.content blocks of type "tool_result" (Anthropic API format).
        const contentBlocks = Array.isArray(message.message?.content)
          ? message.message.content
          : []

        for (const block of contentBlocks) {
          if (block.type === "tool_result") {
            const callId = block.tool_use_id ?? message.parent_tool_use_id ?? "unknown"
            const rawContent = Array.isArray(block.content)
              ? block.content.map((c) => c.text ?? JSON.stringify(c)).join("")
              : typeof block.content === "string"
                ? block.content
                : JSON.stringify(block.content ?? "")
            emit({
              type: "toolCallResult",
              toolCallId: callId,
              toolName: toolCallNames.get(callId) ?? "unknown",
              content: rawContent.slice(0, 10000),
            })
          }
        }
      } else if (message.type === "system" && message.subtype === "init") {
        emit({
          type: "status",
          content: `Session started: ${message.session_id}`,
        })
      }
    }

    emit({ type: "done" })
  } catch (error) {
    emit({ type: "error", content: error.message || String(error) })
    process.exit(1)
  }
}

main()
