"use server"

import { listRunningContainers, RunningContainer } from "@/lib/docker"

const AGENT_BASE_IMAGE_PREFIX = "ghcr.io/youngchingjui/agent-base"

export async function getRunningContainers(): Promise<RunningContainer[]> {
  const containers = await listRunningContainers()
  return containers.filter((c) => c.image.startsWith(AGENT_BASE_IMAGE_PREFIX))
}
