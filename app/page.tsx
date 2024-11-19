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
import { processIssue } from "@/lib/actions"

export default function IssueProcessor() {
  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>GitHub Issue Processor</CardTitle>
        <CardDescription>
          Paste your GitHub issue content below and click "Process" to analyze
          it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={processIssue}>
          <Textarea
            name="issueContent"
            placeholder="Paste GitHub issue content here..."
            className="min-h-[200px] mb-4"
          />
          <Button type="submit">Process Issue</Button>
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
