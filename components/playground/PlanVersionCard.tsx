import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { upsertPlanVersion } from "@/lib/neo4j/services/plan"

export default function PlanVersionCard() {
  async function action(formData: FormData) {
    "use server"

    try {
      const payload = {
        planId: formData.get("planId")?.toString() || undefined,
        workflowId: formData.get("workflowId")?.toString() || undefined,
        content: formData.get("content")!.toString(),
        editMessage: formData.get("editMessage")?.toString() || undefined,
      }

      // Validate that content is provided
      if (!payload.content.trim()) {
        throw new Error("Plan content is required")
      }

      const result = await upsertPlanVersion(payload)
      console.log("Plan version created successfully:", result.id)

      // You could redirect to a success page or back to the same page
      // For now, we'll just redirect back to refresh the form
      redirect("/playground?success=plan-created")
    } catch (error) {
      console.error("Error creating plan version:", error)
      // In a production app, you might want to redirect to an error page
      // or use a more sophisticated error handling mechanism
      redirect(
        `/playground?error=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Plan Version</CardTitle>
        <p className="text-sm text-muted-foreground">
          Create a new version of an existing plan. Provide either a Plan ID to
          create a version of that specific plan, or a Workflow ID to create a
          version of the latest plan for that workflow.
        </p>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="planId">Plan ID (optional)</Label>
              <Input
                id="planId"
                name="planId"
                placeholder="e.g., plan-123..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use this to create a version of a specific plan
              </p>
            </div>
            <div>
              <Label htmlFor="workflowId">Workflow ID (optional)</Label>
              <Input
                id="workflowId"
                name="workflowId"
                placeholder="e.g., workflow-456..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use this to create a version of the latest plan for a workflow
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="content">Plan Content (Markdown) *</Label>
            <Textarea
              id="content"
              name="content"
              required
              rows={8}
              placeholder="Enter your plan content in markdown format..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="editMessage">Edit Message (optional)</Label>
            <Input
              id="editMessage"
              name="editMessage"
              placeholder="Describe what changed in this version..."
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full">
            Create Plan Version
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
