import { z } from "zod"

import { relativePathSchema } from "@/lib/types/utils/path"

// Default image name and literal type
const DEFAULT_AGENT_BASE_IMAGE = "ghcr.io/youngchingjui/agent-base" as const

// Image name that can be overridden via environment variable
export const AGENT_BASE_IMAGE: string =
  process.env.AGENT_BASE_IMAGE ?? DEFAULT_AGENT_BASE_IMAGE

// Literal type representing the default image (useful for narrowing)
export type AgentBaseImage = typeof DEFAULT_AGENT_BASE_IMAGE

// Docker container name validation based on Docker's naming rules
export const containerNameSchema = z
  .string()
  .trim()
  .min(1, "Container name cannot be empty")
  .max(253, "Container name too long") // Docker container name limit
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, "Invalid container name format")
  .describe(
    "Docker container name. Must be 1-253 characters, start with alphanumeric, and contain only alphanumeric, underscore, dot, or hyphen characters."
  )

// Absolute path validation for working directories
export const absolutePathSchema = z
  .string()
  .trim()
  .min(1, "Working directory cannot be empty")
  .max(4096, "Working directory path too long") // Common filesystem limit
  .regex(/^\/.*/, "Working directory must be an absolute path")
  .refine(
    (path) => !path.includes(".."),
    "Working directory cannot contain '..'"
  )
  .describe(
    "Absolute path for working directory. Must start with '/' and not contain '..' segments."
  )

// File contents validation with size limits
export const fileContentsSchema = z
  .string()
  .max(50 * 1024 * 1024, "File contents too large (max 50MB)") // 50MB limit
  .describe("File contents as a string. Maximum size is 50MB.")

// Main schema for writing files to containers, composed of building blocks
export const writeFileInContainerSchema = z.object({
  name: containerNameSchema,
  workdir: absolutePathSchema,
  relPath: relativePathSchema.describe(
    "Relative file path from the working directory. Must be a valid relative path."
  ),
  contents: fileContentsSchema,
  makeDirs: z
    .boolean()
    .default(true)
    .describe(
      "Whether to create parent directories if they don't exist. Defaults to true."
    ),
})

// Export types following the project's patterns
export type ContainerName = z.infer<typeof containerNameSchema>
export type AbsolutePath = z.infer<typeof absolutePathSchema>
export type FileContents = z.infer<typeof fileContentsSchema>
export type WriteFileInContainerParams = z.infer<
  typeof writeFileInContainerSchema
>

// Docker container information returned by docker ps
export interface RunningContainer {
  id: string
  name: string
  image: string
  status: string
  ports?: string
  uptime?: string
  // Optional metadata from container labels
  owner?: string
  repo?: string
  repoFullName?: string
  branch?: string
  // Whether we have an install command configured for this container's repo
  hasInstallCommand?: boolean
  // Whether we have a dev command configured for this container's repo
  hasDevCommand?: boolean
  // Preview subdomain (label set when container is created); used to build visitable URL
  subdomain?: string
}

