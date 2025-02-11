import { getPullRequestDiff } from "@/lib/github/pullRequests"
import { GetFileContentTool } from "@/lib/tools/GetFileContent"
import { SearchCodeTool } from "@/lib/tools/SearchCode"

interface ReviewPullRequestParams {
  repo: string
  pullNumber: number
  baseDir: string
  repoFullName: string
}

export async function reviewPullRequest({
  repo,
  pullNumber,
  baseDir,
  repoFullName,
}: ReviewPullRequestParams) {
  try {
    // Step 1: Retrieve the PR diff
    const diff = await getPullRequestDiff({ repo, pullNumber })
    console.log("Diff retrieved:", diff)

    // Step 2: Initialize tools
    const getFileContentTool = new GetFileContentTool(baseDir)
    const searchCodeTool = new SearchCodeTool(repoFullName)

    // Step 3: Process the diff to get changed files
    const changedFiles = extractChangedFiles(diff)

    // Step 4: Get content for each changed file
    for (const file of changedFiles) {
      console.log(`Retrieving content for: ${file}`)
      const content = await getFileContentTool.handler({ relativePath: file })
      console.log(`Content for ${file}:`, content)
    }

    // Step 5: Use searchCode to find dependencies
    for (const file of changedFiles) {
      const dependencies = await searchCodeTool.handler({ query: file })
      console.log(`Dependencies for ${file}:`, dependencies)
    }

    // Additional logic can be implemented here for further analysis

  } catch (error) {
    console.error("Error reviewing pull request:", error)
    throw error
  }
}

function extractChangedFiles(diff: string): string[] {
  const changedFiles: string[] = []
  const lines = diff.split("\n")
  for (const line of lines) {
    if (line.startsWith("diff --git a/")) {
      const filePath = line.split(" ")[2].substring(2)
      changedFiles.push(filePath)
    }
  }
  return changedFiles
}
