import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  processIssue,
  generateCode,
  commitChanges,
  pushToGithub,
  createPR,
} from "@/lib/actions"

export default function IssueProcessor() {
  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>GitHub Issue Processor</CardTitle>
        <CardDescription>
          Paste your GitHub issue content below and click &quot;Process&quot; to
          analyze it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={processIssue}>
          <Textarea
            name="content"
            placeholder="Paste GitHub issue content here..."
            className="min-h-[200px] mb-4"
          />
          <div className="flex gap-2 flex-wrap">
            <Button type="submit">Process Issue</Button>
            <Button formAction={generateCode} variant="secondary">
              Generate Code
            </Button>
            <Button formAction={commitChanges} variant="outline">
              Commit Changes
            </Button>
            <Button formAction={pushToGithub} variant="outline">
              Push to GitHub
            </Button>
            <Button formAction={createPR} variant="secondary">
              Create PR
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <div className="w-full">
          <h3 className="text-lg font-semibold mb-2">Processed Result:</h3>
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
            {/* <code>{processedData}</code> */}
          </pre>
        </div>
      </CardFooter>
    </Card>
  )
}
