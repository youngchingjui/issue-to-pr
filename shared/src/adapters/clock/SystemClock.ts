import type { Clock } from "@shared/ports/utils/clock"

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}

export default SystemClock

