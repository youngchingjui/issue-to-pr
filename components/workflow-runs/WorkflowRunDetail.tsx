"use client"

import { formatDistanceToNow } from "date-fns"
import { GetLangfuseTraceResponse } from "langfuse-core"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import ObservationView from "@/components/workflow-runs/ObservationView"

interface WorkflowRunDetailProps {
  trace: GetLangfuseTraceResponse
}

export default function WorkflowRunDetail({ trace }: WorkflowRunDetailProps) {
  const { observations } = trace

  const [selectedObservation, setSelectedObservation] = useState<string | null>(
    observations.length > 0 ? observations[0].id : null
  )

  const currentObservation = selectedObservation
    ? observations.find((o) => o.id === selectedObservation)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/workflow-runs">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold">
            {trace.name || "Workflow Run"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Started{" "}
            {formatDistanceToNow(new Date(trace.timestamp), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="text-sm font-medium">Observations</div>
          <div className="space-y-2">
            {observations.map((observation) => (
              <Button
                key={observation.id}
                variant={
                  selectedObservation === observation.id ? "default" : "outline"
                }
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => setSelectedObservation(observation.id)}
              >
                <div>
                  <div className="font-medium">
                    {observation.name || "Observation"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(observation.startTime), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {currentObservation ? (
            <ObservationView observation={currentObservation} />
          ) : (
            <div className="text-center p-12 text-muted-foreground">
              Select an observation to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
