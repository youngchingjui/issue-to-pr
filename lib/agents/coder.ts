import { Agent } from "@/lib/agents/base"
import { getFileContent } from "@/lib/fs"

export class CoderAgent extends Agent {
  REQUIRED_TOOLS = ["write_file", "get_file_content", "get_directory_structure"]

  constructor({ apiKey }: { apiKey: string }) {
    const initialSystemPrompt = `
You are a coding agent responsible for implementing code changes. You are tasked with updating a file according to incoming instructions.

You have access to the following tools:
- write_file: Writes to a file
- get_file_content: Reads the contents of a file
- get_directory_structure: Gets the directory structure of the repository

You may call any of these tools, in sequence or in parallel, to implement the changes.
You must call read_file at least once to understand the existing contents of the file.
You may call get_directory_structure to understand the structure of the repository and identify coding patterns.
You must call write_file near the end of your process to implement the changes.

Always write clean, well-documented code that matches existing codebase style.
Respond with a summary of changes made.`
    super({ systemPrompt: initialSystemPrompt, apiKey })
  }

  private async checkFileExists(relativeFilePath: string): Promise<boolean> {
    try {
      await getFileContent(relativeFilePath)
      return true
    } catch {
      return false
    }
  }

  async generateCode(instructions: string, relativeFilePath: string) {
    const hasTools = this.checkTools()

    if (!hasTools) {
      throw new Error("CoderAgent does not have all the required tools")
    }

    const fileExists = await this.checkFileExists(relativeFilePath)
    if (!fileExists) {
      console.error(`File ${relativeFilePath} does not exist`)
    }

    this.addMessage({
      role: "user",
      content: `Instructions: ${instructions}\nFile to modify: ${relativeFilePath}`,
    })

    return super.runWithFunctions()
  }
}
