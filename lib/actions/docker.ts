"use server"

import {
  listRunningContainers,
  startContainer,
  stopAndRemoveContainer,
} from "@/lib/docker"
import { AGENT_BASE_IMAGE, RunningContainer } from "@/lib/types/docker"

// Use shared constant for the agent base image prefix
const AGENT_BASE_IMAGE_PREFIX = AGENT_BASE_IMAGE

export async function getRunningContainers(): Promise<RunningContainer[]> {
  const containers = await listRunningContainers()
  return containers.filter((c) => c.image.startsWith(AGENT_BASE_IMAGE_PREFIX))
}

export async function launchAgentBaseContainer() {
  const name = `agent-${Date.now()}`
  await startContainer({
    image: AGENT_BASE_IMAGE_PREFIX,
    name,
  })
  return name
}

export async function stopContainer(name: string) {
  await stopAndRemoveContainer(name)
}
