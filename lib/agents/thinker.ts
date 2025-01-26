import {
  LangfuseSpanClient,
  LangfuseTraceClient,
  observeOpenAI,
} from "langfuse"
import OpenAI from "openai"
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions"

import { thinkerAgentPrompt } from "@/lib/prompts"
import { Issue } from "@/lib/types"

import GetFileContentTool from "../tools/GetFileContent"

export class ThinkerAgent {
  tools: ChatCompletionTool[]
  prompt: string
  llm: OpenAI
  dirPath: string
  issue: Issue
  trace: LangfuseTraceClient

  constructor(dirPath: string, trace: LangfuseTraceClient, apiKey: string) {
    this.prompt = thinkerAgentPrompt()
    this.llm = new OpenAI({
      apiKey,
    })
    this.dirPath = dirPath
    this.trace = trace

    // Setup tools
    // const getFileContentTool = new GetFileContentTool(dirPath)
    // this.tools.push(getFileContentTool.tool)
  }

  public async thinkAboutIssue(span: LangfuseSpanClient) {
    const instructionPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: `
    You are a Product Manager that is reviewing a Github issue submitted by a user or engineer.
    Your job is to better understand the issue. 
    Please try to understand the user's intent and the problem they are trying to solve.
    Also think about ways to split this issue into smaller issues.
    Then expand upon the issue with more details.
    `,
    }

    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: `
      Github issue title: ${this.issue.title}
      Github issue description: ${this.issue.body}
      `,
    }

    const response = await observeOpenAI(this.llm, {
      parent: span,
      generationName: "thinkAboutIssue",
    }).chat.completions.create({
      messages: [instructionPrompt, userMessage],
      model: "gpt-4o",
    })

    console.log(response.choices[0].message.content)

    return response.choices[0].message.content
  }

  public async exploreCodebase() {}
  public async generateComment() {}
}
