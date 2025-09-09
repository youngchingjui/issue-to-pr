export type ContainerStatus = "created" | "running" | "stopped" | "removed"

export interface ContainerProps {
  /**
   * Optional unique identifier of the container, typically assigned by the
   * runtime (e.g. Docker). If omitted the container is considered not yet
   * created in the runtime.
   */
  id?: string

  /**
   * Docker image that the container is based on.
   */
  image: string

  /**
   * Human friendly name for the container.
   */
  name?: string

  /**
   * Initial status of the container. Defaults to `"created"`.
   */
  status?: ContainerStatus
}

/**
 * Core entity representing a container in which LLM agents can operate.
 *
 * This entity holds the minimal state required to reason about a container
 * without depending on any Docker specific implementation details. It can be
 * extended with ports and services to actually manage a running container.
 */
export class Container {
  private _id?: string
  private readonly _image: string
  private _name?: string
  private _status: ContainerStatus

  constructor({ id, image, name, status = "created" }: ContainerProps) {
    if (!image) {
      throw new Error("Container image is required")
    }

    this._id = id
    this._image = image
    this._name = name
    this._status = status
  }

  get id(): string | undefined {
    return this._id
  }

  get image(): string {
    return this._image
  }

  get name(): string | undefined {
    return this._name
  }

  get status(): ContainerStatus {
    return this._status
  }

  /**
   * Mark the container as started.
   */
  start(): void {
    this._status = "running"
  }

  /**
   * Mark the container as stopped.
   */
  stop(): void {
    this._status = "stopped"
  }

  /**
   * Mark the container as removed and clear its identifier.
   */
  remove(): void {
    this._status = "removed"
    this._id = undefined
  }
}

export default Container
