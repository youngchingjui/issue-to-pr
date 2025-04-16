import { LangfuseTraceClient } from "langfuse"
import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

import { CoderAgent } from "@/lib/agents/coder"
import { Tool } from "@/lib/types"

import GetDirectoryStructureTool from "./GetDirectoryStructure"
import GetFileContentTool from "./GetFileContent"
import WriteFileContentTool from "./WriteFileContent"

const callCoderAgentParameters = z.object({
  instructions: z.string().describe("The instructions to the coder agent"),
  relativeFilePath: z.string().describe("The relative path of the file to fix"),
})

class CallCoderAgentTool implements Tool<typeof callCoderAgentParameters> {
  // This tool will spin up a new coder agent every time it is called
  private apiKey: string
  private baseDir: string
  parameters = callCoderAgentParameters
  trace: LangfuseTraceClient
  tool = zodFunction({
    name: "call_coder_agent",
    parameters: callCoderAgentParameters,
    description: "Calls the coder agent to fix the code",
  })

  constructor({ apiKey, baseDir }: { apiKey: string; baseDir: string }) {
    this.apiKey = apiKey
    this.baseDir = baseDir
  }

  async handler(
    params: z.infer<typeof callCoderAgentParameters>
  ): Promise<string> {
    const { instructions, relativeFilePath } = params

    const coderAgent = new CoderAgent({
      apiKey: this.apiKey,
    })

    const getFileContentTool = new GetFileContentTool(this.baseDir)
    const writeFileTool = new WriteFileContentTool(this.baseDir)
    const getDirectoryStructureTool = new GetDirectoryStructureTool(
      this.baseDir
    )

    coderAgent.addTool(getFileContentTool)
    coderAgent.addTool(writeFileTool)
    coderAgent.addTool(getDirectoryStructureTool)

    await coderAgent.addMessage({
      role: "user",
      content: `Instructions: ${instructions}\nFile to modify: ${relativeFilePath}`,
    })

    // Start the run
    const response = await coderAgent.runWithFunctions()
    const lastMessage = response.messages[response.messages.length - 1]
    if (typeof lastMessage.content !== "string") {
      throw new Error(
        `Last message content is not a string. Here's the content: ${JSON.stringify(
          lastMessage.content
        )}`
      )
    }
    return lastMessage.content
  }
}

export default CallCoderAgentTool
