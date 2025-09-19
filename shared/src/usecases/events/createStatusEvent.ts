import { z } from "zod"
import type { UnitOfWork } from "@shared/ports/unitOfWork"
import type { IdGenerator } from "@shared/ports/utils/id"
import type { Clock } from "@shared/ports/utils/clock"

const CreateStatusEventInput = z.object({
  workflowId: z.string().min(1),
  content: z.string().min(1),
  parentId: z.string().optional(),
})
export type CreateStatusEventInput = z.infer<typeof CreateStatusEventInput>

export type CreatedStatusEvent = {
  id: string
  workflowId: string
  content: string
  createdAt: Date
  parentId?: string
}

export class CreateStatusEventUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async exec(raw: CreateStatusEventInput): Promise<CreatedStatusEvent> {
    const input = CreateStatusEventInput.parse(raw)
    const id = this.ids.next()
    const createdAt = this.clock.now()

    await this.uow.withTransaction(async (tx) => {
      await tx.eventRepo.createStatus({ id, content: input.content }, tx)
      await tx.eventRepo.appendToWorkflowEnd(
        input.workflowId,
        id,
        input.parentId,
        tx
      )
    })

    return {
      id,
      workflowId: input.workflowId,
      content: input.content,
      createdAt,
      ...(input.parentId ? { parentId: input.parentId } : {}),
    }
  }
}

