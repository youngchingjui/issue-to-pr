import OpenAI from "openai"
import { z, ZodType } from "zod"

import { Tool } from "@/lib/types"

/**
 * Very small helper around the new OpenAI `responses` API that mirrors the behaviour of
 * {@link Agent.runWithFunctions}. It executes tool calls in a loop until the model
 * returns a final answer (no further tool calls).
 *
 * NOTE: This helper purposefully *does not* deal with Langfuse / Neo4j *yet* – the
 * goal of the first iteration is simply to get something working that other parts
 * of the code-base can experiment with.
 */
export async function runResponsesLoop({
  openai,
  model,
  instructions,
  userInput,
  tools,
  maxIterations = 10,
}: {
  openai: OpenAI
  model: string
  /** The system / developer prompt. */
  instructions: string
  /** Aggregated user messages / input. */
  userInput: string
  tools: Tool<ZodType, unknown>[]
  /**
   * A hard-stop so we never run into an infinite loop in case the model continues
   * to call tools. Defaults to 10 iterations which should be more than enough for
   * most use-cases.
   */
  maxIterations?: number
}) {
  // Convert our internal `Tool` representation to the format expected by the
  // responses API. The responses API wants an array of `FunctionTool`s which look
  // like:
  // {
  //   type: 'function',
  //   name: string,
  //   description?: string,
  //   parameters: {},
  //   strict: true
  // }
  const responseTools = tools.map((tool) => ({
    type: "function" as const,
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
    // In order to make life easier we always mark the tool as strict so that the
    // model is forced to send valid JSON that we can then safely `JSON.parse`.
    strict: true,
  }))

  let toolOutputs: Array<{ tool_call_id: string; output: string }> = []
  let iterations = 0

  while (iterations < maxIterations) {
    iterations += 1

    const params: Record<string, unknown> = {
      model,
      instructions,
      input: userInput,
      tools: responseTools,
    }

    if (toolOutputs.length > 0) {
      params.tool_outputs = toolOutputs
    }

    // `stream` is intentionally left out for now – this helper only supports the
    // simple, non-streaming workflow.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – the current version of the OpenAI type-defs might not yet know
    //               about the responses API. Falling back to `any` keeps the code
    //               compiling until the official types are published.
    const response: any = await openai.responses.create(params as any)

    // Short-circuit if the model does *not* request a tool call – we are done 🎉
    const functionCalls = (response.output ?? []).filter(
      (item: any) => item.type === "function_call"
    )

    if (!functionCalls.length) {
      return response
    }

    // Otherwise we have to execute each tool call and gather the outputs for the
    // next iteration.
    toolOutputs = []

    for (const call of functionCalls) {
      const tool = tools.find((t) => t.function.name === call.name)
      if (!tool) {
        toolOutputs.push({
          tool_call_id: call.call_id,
          output: `Tool with name ${call.name} not found`,
        })
        continue
      }

      let parsedArgs: unknown
      try {
        parsedArgs = JSON.parse(call.arguments)
      } catch (err) {
        toolOutputs.push({
          tool_call_id: call.call_id,
          output: `Failed to parse arguments for tool ${call.name}: ${(err as Error).message}`,
        })
        continue
      }

      // Validate the arguments against the tool schema.
      const validation = (tool.schema as z.ZodType).safeParse(parsedArgs)
      if (!validation.success) {
        toolOutputs.push({
          tool_call_id: call.call_id,
          output: `Invalid arguments for tool ${call.name}: ${validation.error.message}`,
        })
        continue
      }

      // Finally execute the tool handler.
      try {
        const toolResult = await tool.handler(validation.data)
        const asString =
          typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult)

        toolOutputs.push({
          tool_call_id: call.call_id,
          output: asString,
        })
      } catch (err) {
        toolOutputs.push({
          tool_call_id: call.call_id,
          output: `Tool ${call.name} threw an error: ${(err as Error).message}`,
        })
      }
    }
  }

  throw new Error(`Max iterations (${maxIterations}) reached without a final answer.`)
}

