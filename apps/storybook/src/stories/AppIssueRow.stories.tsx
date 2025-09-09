import type { Meta, StoryObj } from "@storybook/nextjs"
import React from "react"

import IssueRow from "@/components/issues/IssueRow"
import { Table, TableBody } from "@/components/ui/table"

const meta: Meta<typeof IssueRow> = {
  title: "App/IssueRow",
  component: IssueRow,
  parameters: {
    layout: "padded",
  },
}

export default meta

type Story = StoryObj<typeof IssueRow>

const issue = {
  id: 123456789,
  node_id: "I_kwDOABC123",
  url: "https://api.github.com/repos/owner/repo/issues/123",
  repository_url: "https://api.github.com/repos/owner/repo",
  labels_url:
    "https://api.github.com/repos/owner/repo/issues/123/labels{/name}",
  comments_url: "https://api.github.com/repos/owner/repo/issues/123/comments",
  events_url: "https://api.github.com/repos/owner/repo/issues/123/events",
  html_url: "https://github.com/owner/repo/issues/123",
  number: 123,
  title: "Fix bug: clicking Create PR crashes on empty description",
  state: "open" as const,
  state_reason: null,
  updated_at: new Date().toISOString(),
  created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  closed_at: null,
  user: {
    login: "octocat",
    id: 1,
    node_id: "MDQ6VXNlcjE=",
    avatar_url: "https://github.com/images/error/octocat_happy.gif",
    gravatar_id: "",
    url: "https://api.github.com/users/octocat",
    html_url: "https://github.com/octocat",
    followers_url: "https://api.github.com/users/octocat/followers",
    following_url:
      "https://api.github.com/users/octocat/following{/other_user}",
    gists_url: "https://api.github.com/users/octocat/gists{/gist_id}",
    starred_url: "https://api.github.com/users/octocat/starred{/owner}{/repo}",
    subscriptions_url: "https://api.github.com/users/octocat/subscriptions",
    organizations_url: "https://api.github.com/users/octocat/orgs",
    repos_url: "https://api.github.com/users/octocat/repos",
    events_url: "https://api.github.com/users/octocat/events{/privacy}",
    received_events_url: "https://api.github.com/users/octocat/received_events",
    type: "User" as const,
    site_admin: false,
  },
  labels: [],
  assignee: null,
  assignees: [],
  milestone: null,
  locked: false,
  active_lock_reason: null,
  comments: 0,
  pull_request: undefined,
  body: "This is a test issue description.",
  reactions: {
    url: "https://api.github.com/repos/owner/repo/issues/123/reactions",
    total_count: 0,
    "+1": 0,
    "-1": 0,
    laugh: 0,
    hooray: 0,
    confused: 0,
    heart: 0,
    rocket: 0,
    eyes: 0,
  },
  timeline_url: "https://api.github.com/repos/owner/repo/issues/123/timeline",
  performed_via_github_app: null,
  author_association: "NONE" as const,
  // IssueWithStatus specific properties
  hasActiveWorkflow: false,
  hasPlan: true,
  hasPR: false,
  planId: "abc123",
  prNumber: undefined,
}

export const Default: Story = {
  args: {
    issue,
    repoFullName: "owner/repo",
  },
  render: (args) => (
    <Table>
      <TableBody>
        <IssueRow {...args} />
      </TableBody>
    </Table>
  ),
}
