import { WorkflowEvent } from "@/lib/services/WorkflowPersistenceService"

export function EventDetails({ event }: { event: WorkflowEvent }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">Event Type</h3>
        <p className="text-sm capitalize">{event.type.replace(/_/g, " ")}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-1">Data</h3>
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      </div>

      {event.metadata && (
        <div>
          <h3 className="text-sm font-medium mb-1">Metadata</h3>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
