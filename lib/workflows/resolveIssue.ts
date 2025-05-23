// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { CoderAgent } from "@/lib/agents/coder"
import { createDirectoryTree } from "@/lib/fs"
import { getIssueComments } from "@/lib/github/issues"
import { checkRepoPermissions } from "@/lib/github/users"
import { langfuse } from "@/lib/langfuse"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { listPlansForIssue } from "@/lib/neo4j/services/plan"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import {
  createBranchTool,
  createCommitTool,
  createCreatePRTool,
  createGetFileContentTool,
  createRipgrepSearchTool,
  createSyncBranchTool,
  createWriteFileContentTool,
} from "@/lib/tools"
import {
  createRepoFullName,
  GitHubIssue,
  GitHubRepository,
  RepoPermissions,
} from "@/lib/types/github"
import { setupLocalRepository } from "@/lib/utils/utils-server"

interface ResolveIssueParams {
  issue: GitHubIssue
  repository: GitHubRepository
  apiKey: string
  jobId: string
  createPR?: boolean
}

// Utility to extract branch name from tool call messages if possible
type ToolMessage = {
  role: string
  content?: string | null
  tool_call_id?: string
}

type ToolCallType = {
  function?: {
    name?: string
    arguments?: string
  }
}

export const resolveIssue = async (params: ResolveIssueParams) => {
  const { issue, repository, apiKey, jobId, createPR } = params
  const workflowId = jobId // Keep workflowId alias for clarity if preferred

  let userPermissions: RepoPermissions | null = null

  try {
    // Emit workflow start event
    await initializeWorkflowRun({
      id: workflowId,
      type: "resolveIssue",
      issueNumber: issue.number,
      repoFullName: repository.full_name,
      postToGithub: createPR,
    })

    await createStatusEvent({
      workflowId,
      content: `Starting workflow for issue #${issue.number} in ${repository.full_name}`,
    })

    // Check permissions if PR creation is intended
    if (createPR) {
      userPermissions = await checkRepoPermissions(repository.full_name)
      if (!userPermissions.canPush || !userPermissions.canCreatePR) {
        // Log a warning instead of throwing an error
        await createStatusEvent({
          workflowId,
          content: `Warning: Insufficient permissions to create PR (${userPermissions.reason}). Code will be generated locally only.`,
        })

        // Proceed with the workflow, but PR won't be created
      }
    }

    // Setup local repository
    const baseDir = await setupLocalRepository({
      repoFullName: repository.full_name,
      workingBranch: repository.default_branch,
    })

    // Start a trace for this workflow
    const trace = langfuse.trace({
      name: "Resolve issue",
    })
    const span = trace.span({ name: "coordinate" })

    // Generate a directory tree of the codebase
    const tree = await createDirectoryTree(baseDir)

    // Retrieve all the comments on the issue
    const comments = await getIssueComments({
      repoFullName: repository.full_name,
      issueNumber: issue.number,
    })

    // Initialize the persistent coder agent
    const coder = new CoderAgent({
      apiKey,
      createPR: Boolean(
        createPR && userPermissions?.canPush && userPermissions?.canCreatePR
      ),
    })
    await coder.addJobId(jobId)
    coder.addSpan({ span, generationName: "resolveIssue" })

    // Load base tools
    const getFileContentTool = createGetFileContentTool(baseDir)
    const searchCodeTool = createRipgrepSearchTool(baseDir)
    const writeFileTool = createWriteFileContentTool(baseDir)
    const branchTool = createBranchTool(baseDir)
    const commitTool = createCommitTool(baseDir, repository.default_branch)

    // Add base tools to persistent coder
    coder.addTool(getFileContentTool)
    coder.addTool(writeFileTool)
    coder.addTool(searchCodeTool)
    coder.addTool(branchTool)
    coder.addTool(commitTool)

    // Add sync and PR tools only if createPR is true AND permissions are sufficient
    let syncBranchTool: ReturnType<typeof createSyncBranchTool> | undefined
    let createPRTool: ReturnType<typeof createCreatePRTool> | undefined
    if (createPR && userPermissions?.canPush && userPermissions?.canCreatePR) {
      syncBranchTool = createSyncBranchTool(
        createRepoFullName(repository.full_name),
        baseDir
      )
      createPRTool = createCreatePRTool(repository, issue.number)

      coder.addTool(syncBranchTool)
      coder.addTool(createPRTool)

      await createStatusEvent({
        workflowId,
        content:
          "You have permissions to push commits and create pull requests on this repository.",
      })
    } else if (createPR) {
      await createStatusEvent({
        workflowId,
        content:
          "You don't have sufficient permissions to push commits or create pull requests on this repository. Changes will only be made locally.",
      })
    }

    // Track the span for the coder agent on LangFuse
    coder.addSpan({ span, generationName: "Edit Code" })

    // Add issue information as user message
    await coder.addMessage({
      role: "user",
      content: `Github issue title: ${issue.title}\nGithub issue description: ${issue.body}`,
    })

    // Add comments if they exist
    if (comments && comments.length > 0) {
      await coder.addMessage({
        role: "user",
        content: `Github issue comments:\n${comments
          .map(
            (comment) => `
- **User**: ${comment.user?.login}
- **Created At**: ${new Date(comment.created_at).toLocaleString()}
- **Reactions**: ${comment.reactions ? comment.reactions.total_count : 0}
- **Comment**: ${comment.body}
`
          )
          .join("\n")}`,
      })
    }

    // Add tree information as user message
    if (tree && tree.length > 0) {
      await coder.addMessage({
        role: "user",
        content: `Here is the codebase's tree directory:\n${tree.join("\n")}`,
      })
    }

    // Check for existing plan
    const plans = await listPlansForIssue({
      repoFullName: repository.full_name,
      issueNumber: issue.number,
    })
    plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Take the latest plan for now.
    // TODO: Add a UI to allow the user to select a plan
    const plan = plans[0]

    if (plan) {
      // Inject the plan itself as a user message (for clarity, before issue/comments/tree)
      await coder.addMessage({
        role: "user",
        content: `
Implementation plan for this issue (from previous workflow):
${plan.content}
`,
      })
    }

    // Run the persistent coder to implement changes

    await createStatusEvent({
      workflowId,
      content: "Starting code implementation",
    })

    const coderResult = await coder.runWithFunctions()

    /**************************************/
    // FALLBACK: Guarantee Pull Request Creation
    /**************************************/
    if (
      createPR &&
      userPermissions?.canPush &&
      userPermissions?.canCreatePR &&
      createPRTool
    ) {
      // Try to find a message from the create_pull_request tool in the coder's messages
      const prCreated = !!coder.messages.find(
        (msg: any) =>
          msg.role === "tool" &&
          typeof msg.content === "string" &&
          // For safety, check via function name in previous tool call, or tool_call_id association
          (msg.tool_call_id &&
            coder.messages.find(
              (c: any) =>
                (c.role === "assistant" || c.role === "tool_call") &&
                c.tool_calls &&
                Array.isArray(c.tool_calls) &&
                c.tool_calls.some(
                  (tc: any) =>
                    tc.id === msg.tool_call_id &&
                    tc.function &&
                    tc.function.name === "create_pull_request"
                )
            ))
      )
      // Only continue if not detected as PR created
      if (!prCreated) {
        // Try to get the branch from the last commit, sync, or branch tool call
        let usedBranch: string | undefined = undefined
        // Scan from the end to the start for the most likely-used branch
        for (let i = coder.messages.length - 1; i >= 0; i--) {
          const msg = coder.messages[i]
          if (msg.role === "tool" && typeof msg.content === "string") {
            // See if this is a commit, branch, or sync_branch tool result and try to parse the branch name
            try {
              const parsed = JSON.parse(msg.content)
              if (parsed && parsed.branch) {
                usedBranch = parsed.branch
                break
              }
            } catch {
              // Could not parse, continue
            }
          }
        }
        if (!usedBranch) {
          // Fallback to repository.default_branch or inform error
          usedBranch = repository.default_branch || "main"
        }
        // Title and body for fallback PR
        const prTitle = issue.title || `Automated code changes for Issue #${issue.number}`
        let prBody = `This pull request implements the plan for resolving issue #${issue.number}.\n`;
        if (plan) {
          prBody += `\n## Implementation Plan\n${plan.content}`
        }
        // Actually attempt PR creation via tool handler:
        try {
          const prResult = await createPRTool.handler({
            branch: usedBranch,
            title: prTitle,
            body: prBody
          })
          let parsedResult = prResult
          try {
            parsedResult = JSON.parse(prResult)
          } catch {
            // If handler didn't return JSON, wrap as error
            parsedResult = { status: "error", message: prResult }
          }
          if (parsedResult.status === "success") {
            await createStatusEvent({
              workflowId,
              content: `Fallback: Pull request successfully created from branch '${usedBranch}'.`,
            })
          } else {
            await createErrorEvent({
              workflowId,
              content: `Fallback PR creation failed: ${parsedResult.message}`,
            })
          }
        } catch (prError: any) {
          await createErrorEvent({
            workflowId,
            content: `Fallback PR creation threw error: ${prError?.message || prError}`,
          })
        }
      }
    }
    /**************************************/
    // End Fallback
    /**************************************/

    // Emit completion event
    await createWorkflowStateEvent({
      workflowId,
      state: "completed",
    })

    return coderResult
  } catch (error) {
    // Emit error event

    await createErrorEvent({
      workflowId,
      content: String(error),
    })

    throw error
  }
}
