- [] create outline of REST APIs for Queues (separate branch)
- Create a system to separately launch the Queues on our redis with our defaults. should not be tied to nextjs service
- Need ioredis for bullmq to work (with queues)
- Create queue service in /shared
- Remove this todo once done.

Goal of PR:

- Should be able to run `pnpm dev` or `pnpm build` and `pnpm start` and play with queues and workers in the playground. All the fundamentals should be available and working in order to test the system with WorkerDashboardCard.tsx
- Documentation should be updated to reflect this narrow change.

To be left for other PRs:

- Tests
- Additional Documentation
- Add authentication / permissions to the new API routes (ie /api/queues). Generally users shouldn't have access to managing queues or directly interacting with queues (adding jobs). They should be done through the UI.
