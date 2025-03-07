"use client"
import { formatDistanceToNow } from "date-fns"
import ReactMarkdown from "react-markdown"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ToolCallView from "@/components/workflow-runs/ToolCallView"
import { Observation } from "@/lib/types/langfuse"

interface ObservationViewProps {
  observation: Observation
}

export default function ObservationView({ observation }: ObservationViewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{observation.name || "Observation"}</CardTitle>
          <Badge variant="outline">{observation.type}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Started{" "}
          {formatDistanceToNow(new Date(observation.startTime), {
            addSuffix: true,
          })}
          {observation.endTime &&
            ` • Completed ${formatDistanceToNow(new Date(observation.endTime), { addSuffix: true })}`}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="messages">
          <TabsList className="mb-4">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="tool-calls">Tool Calls</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            <MessagesView observation={observation} />
          </TabsContent>

          <TabsContent value="tool-calls">
            <ToolCallsView observation={observation} />
          </TabsContent>

          <TabsContent value="metadata">
            <MetadataView observation={observation} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function MessagesView({ observation }: { observation: Observation }) {
  if (!observation.input && !observation.output) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        No messages found
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {observation.input?.messages?.map((message, index) => (
        <div key={index} className="p-4 rounded-lg bg-muted">
          <div className="font-medium mb-2 text-sm">{message.role}</div>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      ))}

      {observation.output?.content && (
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <div className="font-medium mb-2 text-sm">assistant</div>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{observation.output.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

function ToolCallsView({ observation }: { observation: Observation }) {
  const toolCalls = observation.output?.tool_calls || []

  if (!toolCalls.length) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        No tool calls made
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {toolCalls.map((toolCall, index) => (
        <AccordionItem key={index} value={`tool-call-${index}`}>
          <AccordionTrigger className="text-sm">
            {toolCall.function.name}
          </AccordionTrigger>
          <AccordionContent>
            <ToolCallView toolCall={toolCall} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

function MetadataView({ observation }: { observation: Observation }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-muted">
          <h4 className="text-sm font-medium mb-2">Cost</h4>
          <div className="text-sm">
            <div>Total: ${observation.calculatedTotalCost}</div>
            <div>Input: ${observation.calculatedInputCost}</div>
            <div>Output: ${observation.calculatedOutputCost}</div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted">
          <h4 className="text-sm font-medium mb-2">Tokens</h4>
          <div className="text-sm">
            <div>Total: {observation.totalTokens}</div>
            <div>Input: {observation.promptTokens}</div>
            <div>Output: {observation.completionTokens}</div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted">
        <h4 className="text-sm font-medium mb-2">Model Information</h4>
        <div className="text-sm">
          <div>Model: {observation.model}</div>
          <div>Latency: {observation.latency}ms</div>
        </div>
      </div>
    </div>
  )
}
