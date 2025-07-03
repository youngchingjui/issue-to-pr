import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import { createTool } from "@/lib/tools/helper"

const execSchema = z.object({
  command: z
    .string()
    .describe(
      "Shell command to run inside the container. Be cautious of side-effects."
    ),
})

type ExecParams = z.infer<typeof execSchema>

export const createContainerExecTool = (containerName: string) =>
  // Note: 'container_exec' is taken by o3 (and other?) model(s)
  createTool({
    name: "container_shell",
    description:
      "Run a shell command inside the docker container that hosts the worktree. Returns stdout and stderr.",
    schema: execSchema,
    handler: async (params: ExecParams) => {
      const { stdout, stderr } = await execInContainer({
        name: containerName,
        command: params.command,
      })
      return JSON.stringify({ stdout, stderr })
    },
  })
