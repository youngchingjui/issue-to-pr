"use server"

import {
  listRunningContainers,
  RunningContainer,
  startContainer,
} from "@/lib/docker"

const AGENT_BASE_IMAGE_PREFIX = "ghcr.io/youngchingjui/agent-base"

export async function getRunningContainers(): Promise<RunningContainer[]> {
  const containers = await listRunningContainers()
  return containers.filter((c) => c.image.startsWith(AGENT_BASE_IMAGE_PREFIX))
}

export async function launchAgentBaseContainer() {
  const name = `agent-${Date.now()}`
  await startContainer({
    image: "ghcr.io/youngchingjui/agent-base",
    name,
  })
  return name
}
