import TaskRow from "@/components/issues/TaskRow"
import { listTasksForRepo } from "@/lib/neo4j/services/task"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
}

export default async function TaskRows({ repoFullName }: Props) {
  const tasks = await listTasksForRepo(repoFullName.fullName)

  if (tasks.length === 0) return null

  return (
    <>
      {tasks.map((task) => (
        <TaskRow key={`task-${task.id}`} task={task} />
      ))}
    </>
  )
}
