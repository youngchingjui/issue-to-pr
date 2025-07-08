"use server"
import Docker from "dockerode"

// TODO: These functions probably belong in the /lib/docker.ts file.

/**
 * Executes `ls -la` in the specified running container using dockerode.
 * Returns either { result: string } or { error: string }.
 * Accepts container name as string.
 */
export async function runLsInContainerWithDockerode(
  name: string
): Promise<{ result?: string; error?: string }> {
  if (!name || typeof name !== "string" || !name.trim()) {
    return { error: "Container name must not be empty." }
  }
  let docker: Docker
  try {
    docker = new Docker({ socketPath: "/var/run/docker.sock" })
  } catch (e: unknown) {
    return { error: `Failed to initialize Dockerode: ${e}` }
  }
  let container: Docker.Container
  try {
    container = docker.getContainer(name)
    // Check if the container exists & is running
    const data = await container.inspect()
    if (!data.State.Running) {
      return { error: "Container is not running." }
    }
  } catch (e: unknown) {
    return { error: "Container not found or not running." }
  }
  try {
    const exec = await container.exec({
      Cmd: ["ls", "-la"],
      AttachStdout: true,
      AttachStderr: true,
    })
    const stream = await exec.start({})
    let output = ""

    // Dockerode streams may use demuxStream for attaching both out/err
    await new Promise<void>((resolve, reject) => {
      container.modem.demuxStream(
        stream,
        {
          write(chunk: Buffer | string) {
            output += chunk.toString()
          },
          end: () => {},
        },
        {
          write(chunk: Buffer | string) {
            output += chunk.toString()
          },
          end: () => {},
        }
      )
      stream.on("end", resolve)
      stream.on("error", reject)
    })
    return { result: output }
  } catch (e: unknown) {
    return {
      error: `Failed to exec ls -la in container: ${e}`,
    }
  }
}
