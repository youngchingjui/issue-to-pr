import type { ContainerWritePort } from "@shared/ports/container/write"
import {
  execInContainerWithDockerode,
  startContainer,
  stopAndRemoveContainer,
  writeFileInContainer,
} from "@/lib/docker"

export function makeDockerContainerAdapter(): ContainerWritePort {
  return {
    async executeCommand({ containerName, command, workingDirectory }) {
      return await execInContainerWithDockerode({
        name: containerName,
        command,
        cwd: workingDirectory,
      })
    },
    async start(params) {
      // Delegate to existing helper
      return await startContainer({
        image: params.image,
        name: params.name,
        user: params.user,
        mounts: params.mounts,
        workdir: params.workdir,
        env: params.env,
        labels: params.labels,
        network: params.network,
      })
    },
    async stop(containerName: string) {
      // Stop+remove for now
      await stopAndRemoveContainer(containerName)
    },
    async remove(containerName: string) {
      await stopAndRemoveContainer(containerName)
    },
    async writeFile(params) {
      return await writeFileInContainer({
        name: params.containerName,
        workdir: params.workdir,
        relPath: params.relPath,
        contents: params.contents,
        makeDirs: params.makeDirs ?? true,
      })
    },
  }
}

