// Here, we create an OpenAI 'agent' that will understand the codebase and identify how to resolve an issue.
// We'll give it access to the codebase through file content retrieval.
// We do not expect it to generate new code. It should only return specific instructions for which files to edit and how to edit them.
// When this agent is called, it will return a JSON object with the following structure:
// {
//   "files": ["path/to/file1", "path/to/file2"],
//   "instructions": ["Instructions for editing file1", "Instructions for editing file2"]
// }
// We use Zod for runtime validation of the response structure and TypeScript for type safety.

import { LangfuseTraceClient, observeOpenAI } from "langfuse"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources"
import { z } from "zod"

import { getFileContent as getGithubFileContent } from "@/lib/github/content"

import { createDirectoryTree, getFileContent, getRepoDir } from "./fs"
import { checkIfGitExists, checkoutBranch, cloneRepo } from "./git"
import { Issue } from "./github-old"
import { langfuse } from "./langfuse"

// TODO: Make this dynamic
const REPO_OWNER = "youngchingjui"
const CLONE_URL = "https://github.com/youngchingjui/issue-to-pr.git"

const agent = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateCodeEditPlan(
  issue: Issue,
  tempDir: string,
  trace: LangfuseTraceClient
): Promise<z.infer<typeof CodeEditPlanSchema>> {
  // Get directory structure to help model understand codebase
  const CodeEditPlanSchema = z.object({
    edits: z.array(
      z.object({
        file: z.string(),
        instructions: z.string(),
      })
    ),
  })

  // TODO: Figure out what to do if repoStructure is very big
  const repoStructure = await createDirectoryTree(tempDir)

  const systemMessage: ChatCompletionMessageParam = {
    role: "system",
    content: `You are a software engineer that helps identify which files need to be modified to resolve GitHub issues.

        You will be given an issue and a directory structure, and potentially the contents of some files. Your task is to:
        1. Analyze the issue and understand what needs to be changed
        2. Use the directory structure to identify potentially relevant files
        3. Read the content of those given files to better understand the codebase.
        4. Identify additional files that may be relevant to the issue.
        5. Provide clear, specific instructions for how each file should be modified.

        Do not generate any code - only provide file paths and modification instructions.
        Respond in JSON format.`,
  }

  const fileContents: { [key: string]: string } = {}

  // Add these files to messages
  // TODO: Automate this portion
  const filesToAdd = ["overview.md", "app/api/resolve/route.ts", "auth.ts"]
  for (const file of filesToAdd) {
    fileContents[file] = await getFileContent(tempDir, file)
  }

  const span = trace.span({ name: "Plan code edits" })

  const userMessage: ChatCompletionMessageParam = {
    role: "user",
    content: `##Issue Title: ${issue.title}\n##Issue Description: ${issue.body}\n##Repository Structure:\n${repoStructure}\n## Relevant files\n ${Object.entries(
      fileContents
    )
      .map(([file, content]) => `File: ${file}\nContent: ${content}`)
      .join("\n")}`,
  }
  const messages = [systemMessage, userMessage]
  const response = await observeOpenAI(agent, {
    parent: span,
    generationName: "Identify relevant files",
  }).chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: zodResponseFormat(CodeEditPlanSchema, "code_edit_plan"),
  })

  console.log(response.choices[0].message.content)

  const codeEditPlan = CodeEditPlanSchema.parse(
    JSON.parse(response.choices[0].message.content)
  )

  if (!codeEditPlan) {
    throw new Error("No content returned from agent")
  }

  span.end()

  await langfuse.flushAsync()

  return codeEditPlan
}

export const identifyRelevantFiles = async (
  issue: Issue,
  cwd: string = null,
  trace: LangfuseTraceClient
): Promise<z.infer<typeof FileListResponseSchema>> => {
  // Given the issue and a tree of files, identify the files that are relevant to the issue
  // We can use the issue title and description to identify the files

  const FileListResponseSchema = z
    .object({
      files: z.array(z.string()),
    })
    .strict()

  const tree = createDirectoryTree(cwd || process.cwd())

  const userInstructions = `
    Given the issue and a tree of files, identify which files are relevant to the issue
    The issue is: ${issue.title}
    The issue description is: ${issue.body}
    Repository tree: ${tree}
    Provide the full relative path to the file(s) that are relevant to the issue
    Output in JSON format
  `

  // TODO: Ensure that the files are relative to the cwd

  const span = trace.span({ name: "Identify relevant files" })
  const response = await observeOpenAI(agent, {
    parent: span,
    generationName: "Identify relevant files",
  }).beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [{ role: "user", content: userInstructions }],
    response_format: zodResponseFormat(FileListResponseSchema, "file_list"),
  })

  console.debug(
    "[DEBUG] File list response:",
    response.choices[0].message.parsed
  )
  span.end()
  await langfuse.flushAsync()
  return FileListResponseSchema.parse(response.choices[0].message.parsed)
}

export async function generateNewContent(
  file: string,
  editInstructions: string,
  trace: LangfuseTraceClient
): Promise<z.infer<typeof CodeSchema>> {
  const CodeSchema = z.object({
    code: z.string(),
  })

  const span = trace.span({ name: "Generate new content span" })

  const systemMessage: ChatCompletionMessageParam = {
    role: "system",
    content: `
  You will receive a file to be updated, and instructions for how to update it. Please generate the updated file.
  `,
  }

  const userMessage: ChatCompletionMessageParam = {
    role: "user",
    content: `File to be updated: ${file}\nInstructions: ${editInstructions}`,
  }

  const messages = [systemMessage, userMessage]

  const response = await observeOpenAI(agent, {
    parent: span,
    generationName: "Generate new content",
  }).chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: zodResponseFormat(CodeSchema, "code"),
  })

  span.end()

  await langfuse.flushAsync()

  return CodeSchema.parse(JSON.parse(response.choices[0].message.content))
}

export class CoordinatorAgent {
  private readonly agent: OpenAI
  private readonly instructionPrompt: string
  private readonly tools: ChatCompletionTool[]
  private readonly trace: LangfuseTraceClient
  public messages: ChatCompletionMessageParam[]
  public outputSchema: z.ZodSchema = z
    .object({
      agent_type: z.enum(["researcher", "librarian", "software_engineer"]),
      request_details: z.string(),
    })
    .strict()

  private issue: Issue

  constructor(issue: Issue = null, trace: LangfuseTraceClient = null) {
    this.agent = agent
    this.messages = []
    this.issue = issue
    this.instructionPrompt = `
## Goal 
Resolve the Github Issue and create a Pull Request

## Your role

You are a scrum master trying to resolve a Github Issue ticket. You'll be coordinating with other agents who specialize in their tasks. Your job is to identify which agent needs to be called next in order to get 1 step closer to resolving this Github issue.

## Your team
These are the agents you can call on to help you. After you call each agent, they will report back to you with new information that should hopefully help you resolve the Github ticket.

- Fact finder: This agent has access to Google searches, and can find any information on the internet for you. You just need to provide some information about what you're looking for, and they'll use Google to conduct an internet search for.

- Librarian: This agent has access to the codebase. They can retrieve information about the codebase for you, including the contents of specific files, as well as the overall codebase structure.

- Coder: This agent can write new code or update existing code for you, based on your instructions.

## Conclusion
Please output in JSON mode. You may call any or all agents, in sequence or in parallel. Again, your goal is to resolve the Github Issue and submit a Pull Request.
`
    this.messages.push({
      role: "system",
      content: this.instructionPrompt,
    })

    this.tools = [
      {
        type: "function",
        function: {
          name: "call_agent",
          description:
            "The agent will call other agents based on what it needs.",
          parameters: {
            type: "object",
            required: ["agent_type", "request_details"],
            properties: {
              agent_type: {
                type: "string",
                description:
                  "Type of agent to call, can be 'researcher', 'librarian', or 'coder'",
                enum: ["researcher", "librarian", "coder"],
              },
              request_details: {
                type: "string",
                description:
                  "Details about the request being made to the agent",
              },
            },
            additionalProperties: false,
          },
          strict: true,
        },
      },
    ]

    if (this.issue) {
      this.messages.push({
        role: "user",
        content: `
## Github Issue
### Title: ${this.issue.title}
### Description: ${this.issue.body}
`,
      })
    }

    if (trace) {
      this.trace = trace
    } else {
      this.trace = langfuse.trace({
        name: "CoordinatorAgent",
      })
    }
  }

  async generateResponse() {
    if (this.messages.length === 0) {
      throw new Error(
        "No messages to process. Please first add at least 1 message"
      )
    }

    const span = this.trace.span({ name: "Coordinate agent team" })

    const response = await observeOpenAI(this.agent, {
      parent: span,
      generationName: "Coordination next step",
    }).chat.completions.create({
      model: "gpt-4o",
      messages: this.messages,
      response_format: zodResponseFormat(this.outputSchema, "output"),
      tools: this.tools,
      tool_choice: {
        type: "function",
        function: {
          name: "call_agent",
        },
      },
    })

    return response.choices[0].message
  }

  public async run() {
    // Initialize with system message if not already present
    if (!this.messages.some((msg) => msg.role === "system")) {
      this.messages.unshift({
        role: "system",
        content: this.instructionPrompt,
      })
    }

    let isComplete = false
    const maxIterations = 10 // Prevent infinite loops
    let iterations = 0

    console.debug("[DEBUG] Messages:", this.messages)

    try {
      while (!isComplete && iterations < maxIterations) {
        iterations++

        // Get next action from the coordinator
        const response = await this.generateResponse()

        console.debug("[DEBUG] Response: ", response)

        if (!response.tool_calls?.[0]) {
          console.log("No further actions needed. Workflow complete.")
          isComplete = true
          break
        }

        // Parse the agent's response
        const toolCall = response.tool_calls[0]
        const toolCallId = toolCall.id
        const functionArgs = JSON.parse(toolCall.function.arguments)

        // Add the agent's decision to the message history
        this.messages.push(response)

        // Log the current step
        console.log(
          `Iteration ${iterations}: Calling ${functionArgs.agent_type} agent`
        )
        console.log(`Request details: ${functionArgs.request_details}`)

        // Here you would implement the actual agent calls
        // For now, we'll simulate the agent responses
        const agentResponse = await this.simulateAgentResponse(
          functionArgs.agent_type,
          functionArgs.request_details
        )

        // Add the agent's response to the conversation
        this.messages.push({
          role: "tool",
          content: JSON.stringify(agentResponse),
          tool_call_id: toolCallId,
        })
      }

      if (iterations >= maxIterations) {
        throw new Error("Maximum iterations reached without resolution")
      }

      return {
        success: true,
        iterations,
        finalMessages: this.messages,
      }
    } catch (error) {
      console.error("Error in coordinator workflow:", error)
      throw error
    }
  }

  // Helper method to simulate agent responses
  private async simulateAgentResponse(
    agentType: string,
    requestDetails: string
  ): Promise<z.infer<typeof this.outputSchema>> {
    // In a real implementation, this would call the actual agent
    // For now, we'll just echo back the request with a simulated response

    if (agentType === "librarian") {
      const librarianAgent = new LibrarianAgent(this.trace)
      await librarianAgent.setupLocalRepo()
      librarianAgent.addUserMessage(requestDetails)
      const response = await librarianAgent.generateResponse()
      console.debug("[DEBUG] Librarian response: ", response)
      return {
        agent_type: "librarian",
        response_details: JSON.stringify(response),
      }
    } else if (agentType === "researcher") {
      // TODO: Implement researcher agent
      return {
        agent_type: "researcher",
        response_details: `Researcher agent not implemented yet. Please find another agent to call.`,
      }
    } else if (agentType === "software_engineer") {
      // TODO: Implement software engineer agent
      return {
        agent_type: "software_engineer",
        response_details: `Software engineer agent not implemented yet. Please find another agent to call.`,
      }
    }

    return {
      agent_type: agentType as "researcher" | "librarian" | "software_engineer",
      request_details: `Completed: ${requestDetails}`,
    }
  }
}

export class LibrarianAgent {
  private trace: LangfuseTraceClient
  private instruction: string
  private readonly messages: ChatCompletionMessageParam[] = []
  private readonly tools: ChatCompletionTool[]
  private repo: string
  private branch: string
  private tree: string[]

  constructor(trace: LangfuseTraceClient) {
    this.repo = "issue-to-pr"
    this.branch = "main"

    if (trace) {
      this.trace = trace
    } else {
      this.trace = langfuse.trace({
        name: "LibrarianAgent",
      })
    }

    this.tools = [
      {
        type: "function",
        function: {
          name: "get_file_content",
          description: "Get the content of a file from the repository",
          parameters: {
            type: "object",
            required: ["path"],
            properties: {
              path: {
                type: "string",
                description: "Path to the file in the repository",
              },
            },
          },
        },
      },
    ]
  }

  async setupLocalRepo() {
    // This ensures LibrarianAgent has access to the repo hosted locally
    // Run this before generating responses
    const repoPath = await getRepoDir(REPO_OWNER, this.repo)

    // Check if .git and codebase exist in tempDir
    // If not, clone the repo
    // If so, checkout the branch
    console.debug(`[DEBUG] Checking if .git and codebase exist in ${repoPath}`)
    const gitExists = await checkIfGitExists(repoPath)
    if (!gitExists) {
      // Clone the repo
      console.debug(`[DEBUG] Cloning repo: ${CLONE_URL}`)
      await cloneRepo(CLONE_URL, repoPath)
    }

    console.debug(`[DEBUG] Checking out branch ${this.branch}`)
    // Checkout the branch
    await checkoutBranch(this.branch, repoPath)

    const cwd = repoPath
    this.tree = await createDirectoryTree(cwd || process.cwd())
    this.updateInstructions()
  }

  private async handleGetFileContent(path: string): Promise<string> {
    const span = this.trace.span({ name: "Get file content" })
    try {
      const content = await getGithubFileContent({
        repo: this.repo,
        path,
        branch: this.branch,
      })

      // GitHub API returns base64 encoded content
      if ("content" in content && typeof content.content === "string") {
        const decodedContent = Buffer.from(content.content, "base64").toString()
        return decodedContent
      }

      throw new Error("Invalid content format received from GitHub")
    } catch (error) {
      console.error("Error getting file content:", error)
      throw error
    } finally {
      span.end()
    }
  }

  addUserMessage(message: string) {
    this.messages.push({
      role: "user",
      content: message,
    })
  }

  private updateInstructions() {
    this.instruction = `
    You are a librarian agent. You have access to the codebase and can retrieve information about the codebase.
    You can request the content of any file using the get_file_content tool.
    This is the directory structure of the codebase: ${this.tree && this.tree.join("\n")}
    When you request for content data, you're actually requesting from Github, which should have the same codebase structure. Just make sure to use the correct relative path.
    Only request for files that exist. If you request for a file that doesn't exist, you'll get an error. Try to identify the correct file to request for.
  `

    // Remove any existing system messages, and add this updated one
    const index = this.messages.findIndex((msg) => msg.role === "system")
    if (index !== -1) {
      this.messages.splice(index, 1)
    }
    // Add the new system message
    this.messages.unshift({
      role: "system",
      content: this.instruction,
    })
  }

  async generateResponse() {
    if (this.messages.length === 0) {
      throw new Error("No messages to process")
    }

    const span = this.trace.span({ name: "Generate librarian response" })

    try {
      const response = await observeOpenAI(agent, {
        parent: span,
        generationName: "Librarian response",
      }).chat.completions.create({
        model: "gpt-4o",
        messages: this.messages,
        tools: this.tools,
      })

      if (!response.choices[0].message.tool_calls) {
        // Return the final message if there are no more tool calls
        return response.choices[0].message
      }

      // Add the tool call message to messages
      this.messages.push(response.choices[0].message)

      // Run all tool calls, and add their results to messages
      for (const toolCall of response.choices[0].message.tool_calls) {
        if (toolCall.function.name === "get_file_content") {
          const args = JSON.parse(toolCall.function.arguments)
          const content = await this.handleGetFileContent(args.path)

          // Add the tool call response to messages, with corresponding tool_call_id
          this.messages.push({
            role: "tool",
            content,
            tool_call_id: toolCall.id,
          })
        }
      }

      // Run another response with the tool call responses
      return this.generateResponse()
    } finally {
      span.end()
    }
  }
}
