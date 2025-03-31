import { Agent } from "@/lib/agents/base"

const SYSTEM_PROMPT = `
You are a coding agent responsible for implementing code changes. You are tasked with updating a file according to incoming instructions.

Before making edits to a file, be sure to read the existing contents of the file.
Understand the existing codebase and identify coding patterns.
You must call write_file near the end of your process to implement the changes.

Always write clean, well-documented code that matches existing codebase style.
Respond with a summary of changes made.
`
export class CoderAgent extends Agent {
  REQUIRED_TOOLS = ["write_file", "get_file_content", "get_directory_structure"]

  constructor({ apiKey }: { apiKey: string }) {
    super({ systemPrompt: SYSTEM_PROMPT, apiKey })
  }
}
