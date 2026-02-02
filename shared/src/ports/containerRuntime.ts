export interface StartContainerOptions {
  image: string
  name: string
  user?: string
  env?: Record<string, string>
  workdir?: string
  labels?: Record<string, string>
  network?: { name: string; aliases?: string[] }
}

export interface ExecInContainerOptions {
  name: string
  command: string
  cwd?: string
}

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export type ContainerState =
  | "created"
  | "running"
  | "paused"
  | "restarting"
  | "removing"
  | "exited"
  | "dead"
  | "not_found"
  | "unknown"

export interface ContainerRuntimePort {
  startContainer(options: StartContainerOptions): Promise<string>
  execInContainer(options: ExecInContainerOptions): Promise<ExecResult>
  stopAndRemoveContainer(name: string): Promise<void>
  getContainerStatus(name: string): Promise<ContainerState>
}
