import KanbanBoard from "@/components/kanban/KanbanBoard"

export const metadata = {
  title: "Kanban Board",
}

export default function KanbanPage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <KanbanBoard />
    </main>
  )
}

