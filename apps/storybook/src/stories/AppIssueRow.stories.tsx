import type { Meta, StoryObj } from "@storybook/react"
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
