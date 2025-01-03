// Here, we create an OpenAI 'agent' that will understand the codebase and identify how to resolve an issue.
// We'll give it access to the codebase through file content retrieval.
// We do not expect it to generate new code. It should only return specific instructions for which files to edit and how to edit them.
// When this agent is called, it will return a JSON object with the following structure:
// {
//   "files": ["path/to/file1", "path/to/file2"],
//   "instructions": ["Instructions for editing file1", "Instructions for editing file2"]
// }
// We use Zod for runtime validation of the response structure and TypeScript for type safety.

import Langfuse, { observeOpenAI } from "langfuse"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { ChatCompletionMessageParam } from "openai/resources"
import { z } from "zod"

import { createDirectoryTree, getFileContent } from "./fs"
import { Issue } from "./github"

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
})

const agent = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function identifyRelevantFiles(issue: Issue, tempDir: string) {
  // Get directory structure to help model understand codebase

  const CodeEditPlanSchema = z.object({
    edits: z.array(
      z.object({
        file: z.string(),
        instructions: z.string(),
      })
    ),
  })

  const trace = langfuse.trace({ name: "Plan code edits" })

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

  const span = trace.span({ name: "Plan code edits span" })

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
    console.error("No content returned from agent")
    return []
  }

  span.end()

  await langfuse.flushAsync()

  return codeEditPlan
}
