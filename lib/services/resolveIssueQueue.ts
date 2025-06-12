// Simple in-process FIFO queue for background resolveIssue jobs.
// WARNING: This solution provides only per-process serialization, not distributed across multiple Next.js processes or serverless lambdas. For full cluster/job reliability, use a distributed queue or persistent worker system.
// Jobs are lost if process restarts or crashes.

export type ResolveIssueJob = () => Promise<void>

class SimpleQueue {
  private queue: ResolveIssueJob[] = [];
  private running = false;

  enqueue(job: ResolveIssueJob) {
    this.queue.push(job);
    this.process();
  }

  private async process() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      try {
        await job?.();
      } catch (e) {
        // Log errors, but proceed to next job
        console.error('[Queue Worker] Error running job:', e);
      }
    }
    this.running = false;
  }
}

export const resolveIssueQueue = new SimpleQueue();
