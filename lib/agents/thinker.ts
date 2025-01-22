import OpenAI from "openai"
import { ChatCompletionTool } from "openai/resources/chat/completions"

import { thinkerAgentPrompt } from "@/lib/prompts"
import { Issue } from "@/lib/types"

import GetFileContentTool from "../tools/GetFileContent"

export class ThinkerAgent {
  tools: ChatCompletionTool[]
  prompt: string
  llm: OpenAI
  dirPath: string
  issue: Issue

  constructor(dirPath: string) {
    this.prompt = thinkerAgentPrompt
    this.llm = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    this.dirPath = dirPath

    // Setup tools
    const getFileContentTool = new GetFileContentTool(dirPath)
    this.tools.push(getFileContentTool.tool)
  }

  public async thinkAboutIssue() {
    const prompt = `
    You are a helpful assistant that is thinking about an issue.
    The issue is: ${this.issue.title}
    The issue description is: ${this.issue.body}
    `

    const response = await this.llm.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      tools: this.tools,
      model: "gpt-4o",
    })

    console.log(response)
  }

  public async exploreCodebase() {}
  public async generateComment() {}
}
