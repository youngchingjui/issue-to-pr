import { z } from "zod"

import { execInContainerWithDockerode } from "@/lib/docker"
import { createTool } from "@/lib/tools/helper"

const execSchema = z.object({
  command: z
    .string()
    .describe(
      "Shell command to run inside the container. All commands provided here will be appended after `sh -c` inside the docker container"
    ),
})

type ExecParams = z.infer<typeof execSchema>

export const createContainerExecTool = (containerName: string) =>
  createTool({
    name: "exec_in_container",
    description: `
      Run a shell command inside the docker container that hosts the worktree.
      Use this tool to read, search for, and write files, conduct git operations, and build and test codebases.
      This tool operates in a Docker container based on a Debian image with Node.js 22, Python 3.11, Poetry, ripgrep, git, tree, and other development tools. 
      Available commands include: 
      - File operations: ls, cat, head, tail, grep, find, tree, cp, mv, rm, mkdir
      - Text processing: grep, sed, awk, sort, uniq, wc
      - Code search: rg (ripgrep) for fast text search across files
      - Version control: git commands for repository management
      - Package management: npm, pnpm for Node.js, pip3, poetry for Python
      - System info: pwd, whoami, env, ps, top
      For writing or editing files, you should use a here-document, e.g., 'cat <<EOF > filename ... EOF', to overwrite the file with new content in a single command. Do not use "apply_patch" as that does not exist.
      When editing files, you must provide the complete file content including your changes, not just the modifications.
      Use cases: exploring codebase structure, searching for specific code patterns, running build commands,
      installing dependencies, checking file contents, and making file modifications.
      Returns stdout, stderr, and exitCode.
      `,
    schema: execSchema,
    handler: async (params: ExecParams) => {
      const { stdout, stderr, exitCode } = await execInContainerWithDockerode({
        name: containerName,
        command: params.command,
      })
      return JSON.stringify({ stdout, stderr, exitCode })
    },
  })
