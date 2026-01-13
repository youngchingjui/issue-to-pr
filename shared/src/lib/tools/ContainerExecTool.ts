import { z } from "zod"

import { execInContainerWithDockerode } from "@/shared/lib/docker"
import { createTool } from "@/shared/lib/tools/helper"

const execSchema = z.object({
  command: z
    .string()
    .describe(
      "Shell command to run inside the container. Be cautious of side-effects."
    ),
})

type ExecParams = z.infer<typeof execSchema>

export const createContainerExecTool = (containerName: string) =>
  createTool({
    name: "exec_in_container",
    description:
      "Run a shell command inside the docker container that hosts the worktree. Returns stdout and stderr.",
    schema: execSchema,
    handler: async (params: ExecParams) => {
      const { stdout, stderr, exitCode } = await execInContainerWithDockerode({
        name: containerName,
        command: params.command,
      })
      return JSON.stringify({ stdout, stderr, exitCode })
    },
  })
