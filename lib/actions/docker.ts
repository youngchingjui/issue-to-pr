"use server"

import {
  listRunningContainers,
  RunningContainer,
  startBasicContainer,
  stopAndRemoveContainer,
} from "@/lib/docker"

export async function getRunningContainers(): Promise<RunningContainer[]> {
  return await listRunningContainers()
}

export async function launchAgentBaseContainer() {
  const name = `agent-${Date.now()}`
  await startBasicContainer({
    image: "ghcr.io/youngchingjui/agent-base",
    name,
  })
  return name
}

export async function stopContainer(name: string) {
  await stopAndRemoveContainer(name)
}
