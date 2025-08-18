import ProgramTimeline from "@/components/common/ProgramTimeline"
import KanbanBoard from "@/components/kanban/KanbanBoard"

export const metadata = {
  title: "Kanban Board",
}

export default function KanbanPage() {
  return (
    <main className="container mx-auto py-8 px-4 space-y-6">
      {/* Program timeline with weeks 5 and 12 highlighted for review */}
      <ProgramTimeline totalWeeks={16} blockLengthWeeks={2} />
      <KanbanBoard />
    </main>
  )
}

