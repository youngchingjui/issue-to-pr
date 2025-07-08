"use server"

import { AGENT_BASE_IMAGE, writeFileInContainer } from "@/lib/docker"
import {
  listRunningContainers,
  RunningContainer,
  startContainer,
  stopAndRemoveContainer,
} from "@/lib/docker"

// Use shared constant for the agent base image prefix
const AGENT_BASE_IMAGE_PREFIX = AGENT_BASE_IMAGE

export async function getRunningContainers(): Promise<RunningContainer[]> {
  const containers = await listRunningContainers()
  return containers.filter((c) => c.image.startsWith(AGENT_BASE_IMAGE_PREFIX))
}

export async function launchAgentBaseContainer() {
  const name = `agent-${Date.now()}`
  await startContainer({
    image: AGENT_BASE_IMAGE,
    name,
  })
  return name
}

export async function stopContainer(name: string) {
  await stopAndRemoveContainer(name)
}

// Server action for UI to write a file into a running container
export async function writeFileToContainer(options: {
  name: string
  workdir: string
  relativePath: string
  contents: string
}): Promise<{ result: string | null; error: string | null }> {
  try {
    await writeFileInContainer(options)
    return { result: `File successfully written to ${options.relativePath}`, error: null }
  } catch (err) {
    return { result: null, error: (err as Error).message }
  }
}
