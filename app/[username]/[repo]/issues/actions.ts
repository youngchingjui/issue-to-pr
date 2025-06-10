"use server"
import { createIssue } from "@/lib/github/issues"

export async function createGitHubIssue({ repoFullName, title, description }: { repoFullName: string, title: string, description: string }) {
  // Validate input
  if (!repoFullName) {
    return { success: false, error: "repoFullName is required" }
  }
  if (!description || description.trim().length < 5) {
    return { success: false, error: "Description is too short or missing" }
  }
  try {
    const issue = await createIssue({ repoFullName, title, body: description })
    return { success: true, issue }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}
