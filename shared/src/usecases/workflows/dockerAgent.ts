import { Agent } from "@shared/entities/agent"
import { Tool } from "@shared/entities/Tool"
import type { ContainerRuntimePort } from "@shared/ports/containerRuntime"
import type {
  CoreWorkflowEvent,
  CoreWorkflowEventType,
  EventPort,
} from "@shared/ports/events"
import type { LLMPort } from "@shared/ports/llm"
import type { TelemetryPort } from "@shared/ports/telemetry"
import { type ZodType } from "zod"

export interface DockerAgentWorkflowParams {
  workflowId: string
  containerName: string
  image: string
  workdir?: string
  env?: Record<string, string>
  labels?: Record<string, string>
  network?: { name: string; aliases?: string[] }
  /** Optional user-id to attribute in telemetry systems */
  userId?: string
}

export interface DockerAgentWorkflowPorts {
  docker: ContainerRuntimePort
  llm: LLMPort
  telemetry: TelemetryPort
  events: EventPort
  /** Generate unique IDs (e.g., for traces). Defaults to a simple random UUID */
  idFactory?: () => string
}

export async function runDockerAgentWorkflow(
  ports: DockerAgentWorkflowPorts,
  params: DockerAgentWorkflowParams
): Promise<{ containerId: string }> {
  const { docker, llm, telemetry, events } = ports
  const idFactory = ports.idFactory ?? (() => crypto.randomUUID())

  // 1) Start telemetry trace
  const trace = await telemetry.startTrace({
    name: "docker-agent-workflow",
    id: params.workflowId ?? idFactory(),
    userId: params.userId,
    metadata: { containerName: params.containerName, image: params.image },
  })

  // 2) Emit workflow_start
  await events.emit(params.workflowId, {
    type: "workflow_start",
    data: {},
    timestamp: new Date(),
  })

  await telemetry.trackEvent(trace, {
    name: "workflow_start",
    level: "info",
    data: { workflowId: params.workflowId },
  })

  // 3) Launch container
  const containerId = await docker.startContainer({
    image: params.image,
    name: params.containerName,
    env: params.env,
    workdir: params.workdir,
    labels: params.labels,
    network: params.network,
  })

  await events.emit(params.workflowId, {
    type: "status",
    data: { status: "container_started", success: true },
    timestamp: new Date(),
  })

  await telemetry.trackEvent(trace, {
    name: "container_started",
    level: "info",
    data: { containerId, name: params.containerName },
  })

  // TODO: We should define these tools in entities/ folder and import
  // 4) Create agent with simple tools
  const tools: Tool<ZodType, unknown>[] = [
    {
      name: "emit_event",
      description: "Emit a structured workflow event",
      async execute(
        args: {
          type: CoreWorkflowEventType
          data?: CoreWorkflowEvent["data"]
        },
        ctx: { emit: (event: CoreWorkflowEvent) => Promise<void> | void }
      ) {
        await ctx.emit({
          type: args.type ?? "status",
          data: args.data ?? { status: "noop" },
          timestamp: new Date(),
        })
        return { ok: true }
      },
    },
    {
      name: "exec_shell",
      description: "Execute a shell command inside the running container",
      async execute(
        args: { command: string; cwd?: string },
        ctx
      ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        await ctx.emit({
          type: "tool_call",
          data: { toolName: "exec_shell", arguments: args },
          timestamp: new Date(),
        })
        const res = await docker.execInContainer({
          name: params.containerName,
          command: args.command,
          cwd: args.cwd ?? params.workdir,
        })
        await ctx.emit({
          type: "tool_response",
          data: { toolName: "exec_shell", response: res },
          timestamp: new Date(),
        })
        return res
      },
    },
  ]

  const agent = new Agent({
    config: {
      id: "docker-agent",
      systemPrompt:
        "You are a helpful development container agent. You can execute shell commands in the container and emit rich events.",
      tools,
    },
    llm,
    events,
    workflowId: params.workflowId,
  })

  // 5) Start agent (emits system prompt)
  await agent.start()

  await telemetry.trackEvent(trace, {
    name: "agent_started",
    level: "info",
  })

  // 6) Demonstrate tool usage and agent event emission
  const emitEvent = agent.getTool("emit_event")
  if (emitEvent) {
    await emitEvent.execute(
      { type: "status", data: { status: "agent_online", success: true } },
      {
        emit: (event) => events.emit(params.workflowId, event),
      }
    )
  }

  const execTool = agent.getTool("exec_shell")
  if (execTool) {
    const res = await execTool.execute(
      { command: 'echo "hello from container"' },
      { emit: (event) => events.emit(params.workflowId, event) }
    )

    await telemetry.trackEvent(trace, {
      name: "exec_shell",
      level: res.exitCode === 0 ? "info" : "error",
      data: { exitCode: res.exitCode },
    })
  }

  await telemetry.endTrace(trace)

  return { containerId }
}
