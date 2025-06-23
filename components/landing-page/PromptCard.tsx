import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PromptCard() {
  return (
    <Card className="w-full max-w-xl mx-auto bg-white border-muted-foreground/30 p-2 shadow-md">
      <CardHeader className="pb-1 px-2 pt-2">
        <span className="text-xs uppercase text-muted-foreground">
          your prompt
        </span>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-1">
        <p className="text-sm">
          add live status indicators to each issue so i can see workflow
          progress at a glance.
        </p>
      </CardContent>
    </Card>
  )
}
