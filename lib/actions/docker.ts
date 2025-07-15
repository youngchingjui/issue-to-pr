"use server"

import {
  listRunningContainers,
  RunningContainer,
  startContainer,
  stopAndRemoveContainer,
  execInContainer,
} from "@/lib/docker";
import { AGENT_BASE_IMAGE } from "@/lib/types/docker";

// Use shared constant for the agent base image prefix
const AGENT_BASE_IMAGE_PREFIX = AGENT_BASE_IMAGE;

export async function getRunningContainers(): Promise<RunningContainer[]> {
  const containers = await listRunningContainers();
  return containers.filter((c) => c.image.startsWith(AGENT_BASE_IMAGE_PREFIX));
}

export async function launchAgentBaseContainer() {
  const name = `agent-${Date.now()}`;
  await startContainer({
    image: AGENT_BASE_IMAGE_PREFIX,
    name,
  });
  return name;
}

export async function stopContainer(name: string) {
  await stopAndRemoveContainer(name);
}

// Helper for writing a file inside a running container
export async function writeFileInContainer({
  name,
  workdir,
  relPath,
  contents,
  makeDirs = false,
}: {
  name: string;
  workdir: string;
  relPath: string;
  contents: string;
  makeDirs?: boolean;
}): Promise<{ exitCode: number; stderr: string }> {
  // Ensure the parent directory exists if requested
  if (makeDirs) {
    const dir = relPath.split("/").slice(0, -1).join("/");
    if (dir) {
      const { exitCode, stderr } = await execInContainer({
        name,
        command: `mkdir -p ${workdir}/${dir}`
      });
      if (exitCode !== 0) {
        return { exitCode, stderr };
      }
    }
  }

  // Write contents using echo or tee
  // (As before, simplified for demo, real code should escape input properly)
  const { exitCode, stderr } = await execInContainer({
    name,
    command: `echo "$CONTENTS" > "${workdir}/${relPath}"`,
    // environment: { CONTENTS: contents }
  });
  return { exitCode, stderr };
}

export async function deleteFileInContainer({
  name,
  workdir,
  relPath,
}: {
  name: string;
  workdir: string;
  relPath: string;
}): Promise<{ exitCode: number; stderr: string }> {
  // Run rm for the file (only files, not directories)
  // We use "test -f" to check it's a regular file before removing
  const cmd = `if [ -f "${workdir}/${relPath}" ]; then rm "${workdir}/${relPath}"; else echo "File not found or not a regular file" >&2; exit 1; fi`;
  const { exitCode, stderr } = await execInContainer({
    name,
    command: cmd,
  });
  return { exitCode, stderr };
}

