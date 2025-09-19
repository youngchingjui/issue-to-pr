export type GitCliError =
  | "AuthFailed"
  | "NetworkError"
  | "RepositoryNotFound"
  | "BranchNotFound"
  | "CheckoutFailed"
  | "FetchFailed"
  | "RemoteNotSet"
  | "InvalidRepository"
  | "Unknown"

export interface GitErrorDetails {
  step: string
  command?: string
  exitCode?: number
  stdout?: string
  stderr?: string
}

