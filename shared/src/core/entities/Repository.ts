export class Repository {
  constructor(
    public readonly fullName: string,
    public readonly owner: string,
    public readonly name: string,
    public readonly defaultBranch: string,
    public readonly cloneUrl?: string,
    public readonly localPath?: string
  ) {}

  static fromFullName(
    fullName: string,
    defaultBranch: string = "main"
  ): Repository {
    const [owner, name] = fullName.split("/")
    if (!owner || !name) {
      throw new Error(`Invalid repository full name: ${fullName}`)
    }
    return new Repository(fullName, owner, name, defaultBranch)
  }

  get isLocal(): boolean {
    return !!this.localPath
  }

  withLocalPath(path: string): Repository {
    return new Repository(
      this.fullName,
      this.owner,
      this.name,
      this.defaultBranch,
      this.cloneUrl,
      path
    )
  }

  withCloneUrl(url: string): Repository {
    return new Repository(
      this.fullName,
      this.owner,
      this.name,
      this.defaultBranch,
      url,
      this.localPath
    )
  }
}
