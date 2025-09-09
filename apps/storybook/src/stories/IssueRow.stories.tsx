import { IssueRow, type SharedIssue } from "@shared/ui/IssueRow"
import type { Meta, StoryObj } from "@storybook/nextjs"
import React from "react"

const meta: Meta<typeof IssueRow> = {
  title: "Shared/IssueRow",
  component: IssueRow,
  parameters: {
    layout: "padded",
  },
}

export default meta

type Story = StoryObj<typeof IssueRow>

const mockIssue: SharedIssue = {
  number: 123,
  title: "Fix bug: clicking Create PR crashes on empty description",
  state: "open",
  updated_at: new Date().toISOString(),
  user: { login: "octocat" },
  hasActiveWorkflow: false,
  hasPlan: true,
  planId: "abc123",
}

export const Default: Story = {
  args: {
    issue: mockIssue,
    repoFullName: "owner/repo",
    onAutoResolve: async () => console.log("autoResolve"),
  },
  render: (args) => (
    <table className="w-full">
      <tbody>
        <IssueRow {...args} />
      </tbody>
    </table>
  ),
}
