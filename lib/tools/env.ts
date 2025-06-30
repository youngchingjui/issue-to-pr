/**
 * Execution environment types for repository operations
 */
export type RepoEnvironment =
  | { kind: "host"; root: string } // legacy host filesystem
  | { kind: "container"; name: string; mount?: string } // container with mount point

/**
 * Helper to normalize legacy baseDir string to RepoEnvironment
 */
export function asEnv(arg: string | RepoEnvironment): RepoEnvironment {
  return typeof arg === "string"
    ? { kind: "host", root: arg } // auto-wrap legacy baseDir
    : arg
}

/**
 * Get the effective root path for file operations within the environment
 */
export function getEnvRoot(env: RepoEnvironment): string {
  switch (env.kind) {
    case "host":
      return env.root
    case "container":
      return env.mount ?? "/workspace"
  }
}
