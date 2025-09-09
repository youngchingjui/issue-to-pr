interface ContainerMount {
  hostPath: string
  containerPath: string
  readOnly?: boolean
}

interface ContainerNetwork {
  name: string
  aliases?: string[]
}

interface StartContainerParams {
  image: string
  name: string
  user?: string
  mounts?: ContainerMount[]
  workdir?: string
  env?: Record<string, string>
  labels?: Record<string, string>
  network?: ContainerNetwork
}

interface ExecuteCommandParams {
  containerName: string
  command: string
  workingDirectory?: string
}

interface ExecuteCommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

interface WriteFileParams {
  containerName: string
  workdir: string
  relPath: string
  contents: string
  makeDirs?: boolean
}

interface WriteFileResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface ContainerWritePort {
  executeCommand(params: ExecuteCommandParams): Promise<ExecuteCommandResult>

  start(params: StartContainerParams): Promise<string>

  stop(containerName: string): Promise<void>

  remove(containerName: string): Promise<void>

  writeFile(params: WriteFileParams): Promise<WriteFileResult>
}
