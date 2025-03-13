import { LangfuseTraceClient, observeOpenAI } from "langfuse"
import OpenAI from "openai"
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions"

import { createDirectoryTree } from "@/lib/fs"
import { getFileContent as getGithubFileContent } from "@/lib/github/content"
import { librarianAgentPrompt } from "@/lib/prompts"
import GetFileContentTool from "@/lib/tools/GetFileContent"
import { GitHubRepository } from "@/lib/types/github"
import { setupLocalRepository } from "@/lib/utils/utils-server"

export class LibrarianAgent {
  private trace?: LangfuseTraceClient
  private instruction: string
  private readonly messages: ChatCompletionMessageParam[] = []
  private readonly tools: ChatCompletionTool[] = []
  private branch: string = "main"
  private tree: string[]
  private repository?: GitHubRepository
  private agent?: OpenAI
  private baseDir?: string

  constructor({
    repository,
    trace,
    apiKey,
    baseDir,
  }: {
    repository?: GitHubRepository
    trace?: LangfuseTraceClient
    apiKey?: string
    baseDir?: string
  }) {
    if (repository) {
      this.repository = repository
    }
    if (trace) {
      this.trace = trace
    }
    if (apiKey) {
      this.agent = new OpenAI({ apiKey })
    }
    if (baseDir) {
      this.baseDir = baseDir
    }
  }

  addTool(tool: ChatCompletionTool) {
    this.tools.push(tool)
  }

  async setupLocalRepo() {
    if (!this.repository) {
      throw new Error("Repository is required to setup local repo")
    }
    if (!this.baseDir) {
      throw new Error("Base directory is required to setup local repo")
    }

    // Use the setupLocalRepository function to initiate the repository setup
    const baseDir = await setupLocalRepository({
      repoFullName: this.repository.full_name,
      workingBranch: this.branch || this.repository.default_branch,
    })

    this.tree = await createDirectoryTree(baseDir)
    this.updateInstructions()
    this.initializeTools()
  }

  private initializeTools() {
    if (!this.baseDir) {
      throw new Error("Base directory is required to initialize tools")
    }
    if (this.tools.length == 0) {
      this.tools.push(new GetFileContentTool(this.baseDir).tool)
    }
  }

  private async handleGetFileContent(path: string): Promise<string> {
    if (!this.repository) {
      throw new Error("Repository is required to get file content")
    }
    const span = this.trace.span({ name: "Get file content" })
    try {
      const content = await getGithubFileContent({
        repoFullName: this.repository.full_name,
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
    if (!this.trace) {
      throw new Error("Trace is required to generate response")
    }
    if (!this.agent) {
      throw new Error("API key is required to generate response")
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
