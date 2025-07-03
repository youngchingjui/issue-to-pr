"use server"

import { listRunningContainers, RunningContainer } from "@/lib/docker"

export async function getRunningContainers(): Promise<RunningContainer[]> {
  return await listRunningContainers()
}
