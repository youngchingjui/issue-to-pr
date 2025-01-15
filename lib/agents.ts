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
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from "openai/resources"
import path from "path"
import { z } from "zod"

import {
  createDirectoryTree,
  getFileContent,
  getLocalRepoDir,
  writeFile,
} from "@/lib/fs"
import { checkIfGitExists, checkoutBranch, cloneRepo } from "@/lib/git"
import { getFileContent as getGithubFileContent } from "@/lib/github/content"
import { langfuse } from "@/lib/langfuse"
import { callCoderTool } from "@/lib/tools"
import { callLibrarianTool } from "@/lib/tools"
import { callResearcherTool } from "@/lib/tools"
import UploadAndPRTool from "@/lib/tools/UploadAndPR"
import { Issue } from "@/lib/types"

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
    fileContents[file] = await getFileContent(path.join(tempDir, file))
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
  private readonly trace: LangfuseTraceClient
  public messages: ChatCompletionMessageParam[]
  private readonly tools: ChatCompletionTool[]
  private uploadAndPrTool: UploadAndPRTool
  private readonly baseDir: string
  private readonly repoName: string
  public outputSchema = z
    .object({
      agent_type: z.enum(["researcher", "librarian", "coder"]),
      request_details: z.string(),
    })
    .strict()

  private issue: Issue

  constructor(
    issue: Issue = null,
    trace: LangfuseTraceClient = null,
    baseDir: string,
    repoName: string
  ) {
    this.agent = agent
    this.messages = []
    this.issue = issue
    this.baseDir = baseDir
    this.repoName = repoName
    this.instructionPrompt = `
## Goal 
Resolve the Github Issue and create a Pull Request

## Your role

You are a scrum master trying to resolve a Github Issue ticket. You'll be coordinating with other agents who specialize in their tasks. Your job is to identify which agent needs to be called next in order to get 1 step closer to resolving this Github issue.

## Your team
These are the agents you can call on to help you. After you call each agent, they will report back to you with new information that should hopefully help you resolve the Github ticket.

- Fact finder: This agent has access to Google searches, and can find any information on the internet for you. You just need to provide some information about what you're looking for, and they'll use Google to conduct an internet search for.

- Librarian: This agent has access to the codebase. They can retrieve information about the codebase for you, including the contents of specific files, as well as the overall codebase structure.

- Coder: This agent can write new code or update existing code for you, based on your instructions. The agent can only make edits to a single file at a time. They won't have access to knowledge about the wider scope of the codebase, or your greater goals. So you'll need to give very specific instructions, such as "remove the line that instantiates the counter object" or "move the counter object to within the function that's called when the button is clicked". You'll most likely also need to read the existing file before you can give such specific instructions.

- Upload and PR: This function can upload the updated files to Github, and create a pull request. This should be the last tool you call. After this tool, you should provide your final output.

## Conclusion
Please output in JSON mode. You may call any or all agents, in sequence or in parallel. Again, your goal is to resolve the Github Issue and submit a Pull Request.
`
    this.messages.push({
      role: "system",
      content: this.instructionPrompt,
    })

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

    // Initialize tools with context
    this.uploadAndPrTool = new UploadAndPRTool(baseDir, repoName)

    // Initialize other tools
    this.tools = [
      callResearcherTool,
      callLibrarianTool,
      callCoderTool,
      this.uploadAndPrTool.tool,
    ]
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
      tools: this.tools,
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

        // Add the agent's decision to the message history
        this.messages.push(response)

        // If no more tool calls, then we're done
        if (!response.tool_calls?.[0]) {
          console.log("No further actions needed. Workflow complete.")
          isComplete = true
          break
        }

        // Run all the tool calls
        for (const toolCall of response.tool_calls) {
          const toolCallId = toolCall.id

          // Log the current step
          console.log(
            `Iteration ${iterations}: Calling ${toolCall.function.name} agent`
          )
          console.log(`Request details: ${toolCall.function.arguments}`)

          // Here you would implement the actual agent calls
          // For now, we'll simulate the agent responses
          const agentResponse = await this.simulateAgentResponse(toolCall)

          // Add the agent's response to the conversation
          this.messages.push({
            role: "tool",
            content: JSON.stringify(agentResponse),
            tool_call_id: toolCallId,
          })
        }

        // After tool calls, loop back on while loop to generate another response
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
  private async simulateAgentResponse(toolCall: ChatCompletionMessageToolCall) {
    // In a real implementation, this would call the actual agent
    // For now, we'll just echo back the request with a simulated response

    const args = JSON.parse(toolCall.function.arguments)

    switch (toolCall.function.name) {
      case "call_librarian":
        const librarianAgent = new LibrarianAgent(this.trace)
        await librarianAgent.setupLocalRepo()
        librarianAgent.addUserMessage(args.request)
        const libResponse = await librarianAgent.generateResponse()
        console.debug("[DEBUG] Librarian response: ", libResponse)
        return {
          agent_type: "librarian",
          response_details: JSON.stringify(libResponse),
        }

      case "call_researcher":
        // TODO: Implement researcher agent
        return {
          agent_type: "researcher",
          response_details: `Researcher agent not implemented yet. Please find another agent to call.`,
        }

      case "call_coder":
        // Create and use the coder agent
        const coderAgent = new CoderAgent(this.trace, this.baseDir)
        const response = await coderAgent.processEditRequest(
          args.instructions,
          args.file
        )

        console.debug("[DEBUG] Coder response: ", response)
        return {
          agent_type: "coder",
          request_details: response,
        }

      case "upload_and_create_PR":
        // Make sure the args fit
        const parsedArgs = this.uploadAndPrTool.parameters.parse(args)
        const uploadAndPRResponse =
          await this.uploadAndPrTool.handler(parsedArgs)

        return {
          agent_type: "upload_and_create_PR",
          request_details: uploadAndPRResponse,
        }

      default:
        throw new Error(`Unknown tool: ${toolCall.function.name}`)
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
    const repoPath = await getLocalRepoDir(REPO_OWNER, this.repo)

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

export class CoderAgent {
  private trace: LangfuseTraceClient
  private messages: ChatCompletionMessageParam[] = []
  private baseDir: string
  private readonly tools: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "write_file",
        description: "Write content to a file in the repository",
        parameters: {
          type: "object",
          required: ["path", "content"],
          properties: {
            path: {
              type: "string",
              description: "Relative path where the file should be written",
            },
            content: {
              type: "string",
              description: "Content to write to the file",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Read content from an existing file",
        parameters: {
          type: "object",
          required: ["path"],
          properties: {
            path: {
              type: "string",
              description: "Relative path to the file to read",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_directory_structure",
        description: "Get the repository directory structure",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
  ]
  private outputSchema = z
    .object({
      summary: z.string(),
      file_path: z.string(),
      type: z.enum(["update", "create"]),
      additional_context: z.string().optional(),
    })
    .strict()

  constructor(trace: LangfuseTraceClient, baseDir: string) {
    this.trace = trace
    this.baseDir = baseDir
  }

  async processEditRequest(instructions: string, filePath?: string) {
    // Add system message explaining the agent's role
    this.messages = [
      {
        role: "system",
        content: `
You are a coding agent responsible for implementing code changes. You are tasked with updating a file according to incoming instructions.

Always write clean, well-documented code that matches existing codebase style.
Respond with a summary of changes made.`,
      },
    ]

    // Add the user's request
    this.messages.push({
      role: "user",
      content: `Instructions: ${instructions}${filePath ? `\nFile to modify: ${filePath}` : ""}`,
    })

    return this.generateResponse()
  }

  private async handleToolCall(
    toolCall: ChatCompletionMessageToolCall
  ): Promise<string> {
    const args = JSON.parse(toolCall.function.arguments)

    switch (toolCall.function.name) {
      case "write_file":
        await writeFile(this.baseDir, args.path, args.content)
        return `File written successfully to ${args.path}`

      case "read_file":
        return await getFileContent(path.join(this.baseDir, args.path))

      case "get_directory_structure":
        return JSON.stringify(await createDirectoryTree(this.baseDir))

      default:
        throw new Error(`Unknown tool: ${toolCall.function.name}`)
    }
  }

  async generateResponse() {
    const span = this.trace.span({ name: "Generate code changes" })

    try {
      const response = await observeOpenAI(agent, {
        parent: span,
        generationName: "Code implementation",
      }).chat.completions.create({
        model: "gpt-4o",
        messages: this.messages,
        tools: this.tools,
      })

      // Handle any tool calls
      if (response.choices[0].message.tool_calls) {
        this.messages.push(response.choices[0].message)

        for (const toolCall of response.choices[0].message.tool_calls) {
          const result = await this.handleToolCall(toolCall)
          this.messages.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          })
        }

        // Continue the conversation
        return this.generateResponse()
      }

      // No more tool calls, return the final response
      return response.choices[0].message.content
    } finally {
      span.end()
    }
  }
}
