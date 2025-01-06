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
import { ChatCompletionMessageParam } from "openai/resources"
import { z } from "zod"

import { createDirectoryTree, getFileContent } from "./fs"
import { Issue } from "./github"
import { langfuse } from "./langfuse"

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
