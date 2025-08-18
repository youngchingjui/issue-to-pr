"use client"

import { Badge } from "@/components/ui/badge"
import TextLg from "@/components/ui/text-lg"

type ParticipantId = 1 | 2 | 3 | 4

const PARTICIPANTS: Record<ParticipantId, { label: string; solid: string; outline: string }> = {
  1: {
    label: "AI champion for dept",
    solid:
      "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100/80",
    outline:
      "bg-transparent text-blue-700 border-blue-300 hover:bg-blue-50/30",
  },
  2: {
    label: "Young & AI",
    solid:
      "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100/80",
    outline:
      "bg-transparent text-purple-700 border-purple-300 hover:bg-purple-50/30",
  },
  3: {
    label: "Whole dept team",
    solid:
      "bg-green-100 text-green-800 border-green-300 hover:bg-green-100/80",
    outline:
      "bg-transparent text-green-700 border-green-300 hover:bg-green-50/30",
  },
  4: {
    label: "Project sponsor",
    solid:
      "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-100/80",
    outline:
      "bg-transparent text-amber-800 border-amber-300 hover:bg-amber-50/30",
  },
}

interface JobDefinition {
  name: string
  required: ParticipantId[]
  optional?: ParticipantId[]
}

const JOBS: JobDefinition[] = [
  { name: "Interview", required: [1, 2], optional: [4] },
  { name: "Build", required: [2] },
  { name: "Share with team", required: [1, 2, 3] },
  { name: "Workshop", required: [1, 2, 3], optional: [4] },
  { name: "Review", required: [1, 2, 4] },
]

function ParticipantPill({
  id,
  optional = false,
}: {
  id: ParticipantId
  optional?: boolean
}) {
  const p = PARTICIPANTS[id]
  const style = optional ? p.outline : p.solid
  return (
    <Badge
      className={`border ${style} whitespace-nowrap`}
      title={`${p.label}${optional ? " (optional)" : ""}`}
    >
      {p.label}
      {optional ? " (optional)" : ""}
    </Badge>
  )
}

export default function SprintBreakdownPage() {
  const participantIds: ParticipantId[] = [1, 2, 3, 4]
  return (
    <div className="container max-w-4xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <TextLg>
          <span className="block sm:inline">Sprint&nbsp;breakdown</span>
        </TextLg>
        <p className="text-muted-foreground">
          Each job lists who is involved. Optional participants are shown with
          an outline pill and lighter background.
        </p>
      </header>

      <section className="space-y-6">
        {JOBS.map((job) => (
          <div
            key={job.name}
            className="rounded-lg border bg-card p-4 sm:p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">{job.name}</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {job.required.map((id) => (
                <ParticipantPill key={`${job.name}-req-${id}`} id={id} />
              ))}
              {job.optional?.map((id) => (
                <ParticipantPill
                  key={`${job.name}-opt-${id}`}
                  id={id}
                  optional
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">
          Legend
        </h4>
        <div className="flex flex-wrap gap-2">
          {participantIds.map((id) => (
            <ParticipantPill key={`legend-${id}`} id={id} />
          ))}
          <ParticipantPill id={4} optional />
        </div>
      </section>
    </div>
  )
}

