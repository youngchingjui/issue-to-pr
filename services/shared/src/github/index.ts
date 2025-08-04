// GitHub related utilities that can be shared
// For now, just types and basic helpers

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
    id: number
  }
  private: boolean
  html_url: string
  description?: string
  fork: boolean
  url: string
  created_at: string
  updated_at: string
  pushed_at?: string
  git_url: string
  ssh_url: string
  clone_url: string
  default_branch: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  user: {
    login: string
    id: number
  }
  labels: Array<{
    id: number
    name: string
    color: string
  }>
  state: "open" | "closed"
  assignee?: {
    login: string
    id: number
  }
  assignees: Array<{
    login: string
    id: number
  }>
  milestone?: {
    id: number
    title: string
  }
  comments: number
  created_at: string
  updated_at: string
  closed_at?: string
  body?: string
  html_url: string
  repository?: GitHubRepository
}

export interface GitHubPullRequest extends GitHubIssue {
  head: {
    label: string
    ref: string
    sha: string
    repo: GitHubRepository
  }
  base: {
    label: string
    ref: string
    sha: string
    repo: GitHubRepository
  }
  merged: boolean
  mergeable?: boolean
  merged_at?: string
  merge_commit_sha?: string
  draft: boolean
}
