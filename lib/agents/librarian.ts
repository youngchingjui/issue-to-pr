import { LangfuseTraceClient, observeOpenAI } from "langfuse"
import OpenAI from "openai"
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions"

import { auth } from "@/auth"
import { createDirectoryTree, getLocalRepoDir } from "@/lib/fs"
import { checkIfGitExists, checkoutBranch, cloneRepo } from "@/lib/git"
import { getFileContent as getGithubFileContent } from "@/lib/github/content"
import { langfuse } from "@/lib/langfuse"
import { librarianAgentPrompt } from "@/lib/prompts"
import { GitHubRepository } from "@/lib/types"
import { getCloneUrlWithAccessToken } from "@/lib/utils"

export class LibrarianAgent {
  private trace: LangfuseTraceClient
  private instruction: string
  private readonly messages: ChatCompletionMessageParam[] = []
  private readonly tools: ChatCompletionTool[]
  private branch: string
  private tree: string[]
  private repository: GitHubRepository
  private agent: OpenAI

  constructor(
    repository: GitHubRepository,
    trace: LangfuseTraceClient,
    apiKey: string
  ) {
    this.repository = repository
    this.branch = "main"
    this.agent = new OpenAI({
      apiKey,
    })

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
    const repoPath = await getLocalRepoDir(this.repository.full_name)

    const session = await auth()

    if (!session) {
      throw new Error("Unauthorized")
    }

    const token = session.user?.accessToken

    // Check if .git and codebase exist in tempDir
    // If not, clone the repo
    // If so, checkout the branch
    console.debug(`[DEBUG] Checking if .git and codebase exist in ${repoPath}`)
    const gitExists = await checkIfGitExists(repoPath)
    if (!gitExists) {
      // Clone the repo
      console.debug(`[DEBUG] Cloning repo: ${this.repository.clone_url}`)

      // Attach access token to cloneUrl
      const cloneUrlWithToken = getCloneUrlWithAccessToken(
        this.repository.full_name,
        token
      )
      await cloneRepo(cloneUrlWithToken, repoPath)
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
        repo: this.repository.name,
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
    this.instruction = librarianAgentPrompt(this.tree)

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
      const response = await observeOpenAI(this.agent, {
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
