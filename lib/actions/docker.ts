"use server"

import { AGENT_BASE_IMAGE } from "@/lib/docker"
import {
  listRunningContainers,
  RunningContainer,
  startContainer,
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
