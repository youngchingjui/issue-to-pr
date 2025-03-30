import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { EventDetails } from "@/components/workflow-runs/events/EventDetails"
import { WorkflowEvent } from "@/lib/types/workflow"

export interface EventCardProps {
  event: WorkflowEvent
  children: React.ReactNode
}

export function EventCard({ event, children }: EventCardProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-left p-4 rounded-lg border hover:border-border transition-colors inline-block border-transparent">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[400px]">
        <EventDetails event={event} />
      </PopoverContent>
    </Popover>
  )
}
