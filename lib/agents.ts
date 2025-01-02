// Here, I want to create an OpenAI 'agent' that will understand the codebase and identify how to resolve an issue.
// We'll give it tools to retreive files from the codebase.
// We do not expect it to generate new code. It should only return specific instructions for which files to edit and how to edit them.
// When this agent is called, its final output should be a JSON object with the following fields:
// - files: an array of strings, each representing a file to edit
// - instructions: an array of strings, each representing a set of instructions for how to edit the file
// Options: Use function calling or structured outputs.

import Langfuse, { observeOpenAI } from "langfuse"
import OpenAI from "openai"
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources"

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

  const trace = langfuse.trace({ name: "Plan code edits" })

  // TODO: Figure out what to do if repoStructure is very big
  const repoStructure = await createDirectoryTree(tempDir)

  const tools: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "get_file_content",
        description:
          "Read the contents of a file from the codebase. Call this whenever you need to read the contents of a file in order to better understand the problem and codebase.",
        parameters: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "The path to the file to read",
            },
          },
          required: ["filePath"],
          additionalProperties: false,
        },
      },
    },
  ]

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a software engineer that helps identify which files need to be modified to resolve GitHub issues.
        You have access to the following tools:
        - get_file_content: Read the contents of specific files

        You will be given an issue and a directory structure. Your task is to:
        1. Analyze the issue and understand what needs to be changed
        2. Use the directory structure to identify potentially relevant files
        3. Read the content of those files if needed to confirm they need changes
        4. Provide clear, specific instructions for how each file should be modified

        Do not generate any code - only provide file paths and modification instructions.`,
    },
    {
      role: "user",
      content: `Issue Title: ${issue.title}\nIssue Description: ${issue.body}\n\nRepository Structure:\n${repoStructure}`,
    },
  ]

  const span = trace.span({ name: "Plan code edits span" })
  let endMessage = false

  while (!endMessage) {
    const response = await observeOpenAI(agent, {
      parent: span,
      generationName: "Identify relevant files",
    }).chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
    })

    messages.push(response.choices[0].message)

    if (response.choices[0].message.tool_calls) {
      const { tool_calls } = response.choices[0].message
      for (const tool_call of tool_calls) {
        const args = JSON.parse(tool_call.function.arguments)
        const filePath = args.filePath
        const fileContent = await getFileContent(tempDir, filePath)
        messages.push({
          role: "tool",
          content: fileContent,
          tool_call_id: tool_call.id,
        })
      }
    } else if (response.choices[0].message.content) {
      endMessage = true
      return response.choices[0].message.content
    }
  }

  return null
}
