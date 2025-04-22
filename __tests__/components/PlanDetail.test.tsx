import { render, fireEvent, screen, waitFor } from "@testing-library/react"
import PlanDetail from "@/components/plans/PlanDetail"

describe("PlanDetail", () => {
  const plan = {
    id: "p1",
    status: "draft",
    type: "issue_resolution",
    createdAt: new Date().toISOString(),
    message: { data: { content: "Do X, then Y." } },
    issue: { number: 3, repoFullName: "user/repo" },
    workflow: { id: "wf-55" }
  }
  it("renders main sections", () => {
    render(<PlanDetail plan={plan} username="user" repo="repo" issueId="3" />)
    expect(screen.getByText(/Plan Details/)).toBeInTheDocument()
    expect(screen.getByDisplayValue("draft")).toBeInTheDocument()
    expect(screen.getByText(/Associated Issue/)).toBeInTheDocument()
    expect(screen.getByText(/Workflow #wf-55/)).toBeInTheDocument()
    expect(screen.getByText(/Do X, then Y/)).toBeInTheDocument()
  })
  it("allows status edit", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any
    render(<PlanDetail plan={plan} username="user" repo="repo" issueId="3" />)
    const select = screen.getByDisplayValue("draft") as HTMLSelectElement
    fireEvent.change(select, { target: { value: "approved" } })
    await waitFor(() => expect(select.value).toBe("approved"))
  })
})
