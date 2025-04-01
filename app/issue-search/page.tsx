import { IssueExplorer } from "@/components/issues/issue-explorer"
import { searchReposWithIssues } from "@/lib/actions/search-issues"

export default function IssueSearchPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Search GitHub Issues</h1>
        <p className="mt-2 text-gray-600">
          Search for issues across GitHub repositories. Results are limited to
          10 repositories at a time.
        </p>
      </div>

      <IssueExplorer searchAction={searchReposWithIssues} />
    </div>
  )
}
