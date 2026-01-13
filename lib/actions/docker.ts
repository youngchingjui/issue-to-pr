"use server"

import Docker from "dockerode"

import {
  execInContainerWithDockerode,
  listRunningContainers,
  startContainer,
  stopAndRemoveContainer,
} from "@/lib/docker"
import { getBuildDeploymentSettings } from "@/lib/neo4j/services/repository"
import { AGENT_BASE_IMAGE, RunningContainer } from "@/lib/types/docker"
import { repoFullNameSchema } from "@/lib/types/github"

// Use shared constant for the agent base image prefix
const AGENT_BASE_IMAGE_PREFIX = AGENT_BASE_IMAGE

export async function getRunningContainers(): Promise<RunningContainer[]> {
  const containers = await listRunningContainers()
  const agentContainers = containers.filter((c) =>
    c.image.startsWith(AGENT_BASE_IMAGE_PREFIX)
  )

  // Enrich with install/dev command availability from repo settings
  const enriched = await Promise.all(
    agentContainers.map(async (c) => {
      if (!c.repoFullName) return c
      try {
        const repoFullName = repoFullNameSchema.parse(c.repoFullName)
        const build = await getBuildDeploymentSettings(repoFullName)
        return {
          ...c,
          hasInstallCommand:
            Boolean(build?.installCommand) &&
            build!.installCommand!.trim() !== "",
          hasDevCommand:
            Boolean(build?.devCommand) && build!.devCommand!.trim() !== "",
        }
      } catch {
        return c
      }
    })
  )

  return enriched
}

export async function launchAgentBaseContainer() {
  const name = `agent-${Date.now()}`
  const ttlHours = Number.parseInt(process.env.CONTAINER_TTL_HOURS ?? "24", 10)
  await startContainer({
    image: AGENT_BASE_IMAGE_PREFIX,
    name,
    labels: {
      preview: "true",
      ...(Number.isFinite(ttlHours) ? { "ttl-hours": String(ttlHours) } : {}),
    },
  })
  return name
}

export async function stopContainer(id: string) {
  await stopAndRemoveContainer(id)
}

/**
 * Run the configured install command for the repo associated with the container.
 * - Looks up the container's labels to find repo owner/repo.
 * - Loads Build & Deployment settings from Neo4j.
 * - Executes the install command inside the container using Dockerode.
 */
export async function runInstallCommand(
  containerIdOrName: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const docker = new Docker({ socketPath: "/var/run/docker.sock" })
  const container = docker.getContainer(containerIdOrName)
  let info: Docker.ContainerInspectInfo
  try {
    info = await container.inspect()
  } catch (e) {
    return {
      stdout: "",
      stderr: `Failed to inspect container: ${e}`,
      exitCode: 1,
    }
  }
  const labels = info?.Config?.Labels ?? {}
  const owner: string | undefined = labels.owner
  const repo: string | undefined = labels.repo
  const repoFullNameStr = owner && repo ? `${owner}/${repo}` : undefined

  if (!repoFullNameStr) {
    return {
      stdout: "",
      stderr:
        "Repository information not found on container labels. Expected 'owner' and 'repo' labels.",
      exitCode: 1,
    }
  }

  let installCommand: string | undefined
  try {
    const repoFullName = repoFullNameSchema.parse(repoFullNameStr)
    const build = await getBuildDeploymentSettings(repoFullName)
    installCommand = build?.installCommand?.trim()
  } catch (e) {
    return {
      stdout: "",
      stderr: `Failed to load repository settings: ${e}`,
      exitCode: 1,
    }
  }

  if (!installCommand) {
    return {
      stdout: "",
      stderr: "No install command configured for this repository.",
      exitCode: 1,
    }
  }

  // Execute inside /workspace by default
  return execInContainerWithDockerode({
    name: containerIdOrName,
    command: installCommand,
    cwd: "/workspace",
  })
}

/**
 * Run the configured development command for the repo associated with the container.
 * Similar to runInstallCommand, but starts the dev process in the background so the
 * request doesn't block if the dev server runs continuously.
 */
export async function runDevCommand(
  containerIdOrName: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const docker = new Docker({ socketPath: "/var/run/docker.sock" })
  const container = docker.getContainer(containerIdOrName)
  let info: Docker.ContainerInspectInfo
  try {
    info = await container.inspect()
  } catch (e) {
    return {
      stdout: "",
      stderr: `Failed to inspect container: ${e}`,
      exitCode: 1,
    }
  }
  const labels = info?.Config?.Labels ?? {}
  const owner: string | undefined = labels.owner
  const repo: string | undefined = labels.repo
  const repoFullNameStr = owner && repo ? `${owner}/${repo}` : undefined

  if (!repoFullNameStr) {
    return {
      stdout: "",
      stderr:
        "Repository information not found on container labels. Expected 'owner' and 'repo' labels.",
      exitCode: 1,
    }
  }

  let devCommand: string | undefined
  try {
    const repoFullName = repoFullNameSchema.parse(repoFullNameStr)
    const build = await getBuildDeploymentSettings(repoFullName)
    devCommand = build?.devCommand?.trim()
  } catch (e) {
    return {
      stdout: "",
      stderr: `Failed to load repository settings: ${e}`,
      exitCode: 1,
    }
  }

  if (!devCommand) {
    return {
      stdout: "",
      stderr: "No development command configured for this repository.",
      exitCode: 1,
    }
  }

  // Start the dev server in the background and write logs to /workspace/logs/dev.log
  const backgroundCmd =
    'mkdir -p /workspace/logs && (nohup sh -lc ' +
    JSON.stringify(devCommand) +
    ' > /workspace/logs/dev.log 2>&1 & echo $!)'

  return execInContainerWithDockerode({
    name: containerIdOrName,
    command: backgroundCmd,
    cwd: "/workspace",
  })
}

