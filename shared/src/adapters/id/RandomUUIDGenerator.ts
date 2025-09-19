import { randomUUID } from "node:crypto"
import type { IdGenerator } from "@shared/ports/utils/id"

export class RandomUUIDGenerator implements IdGenerator {
  next(): string {
    return randomUUID()
  }
}

export default RandomUUIDGenerator

