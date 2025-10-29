## AutoResolveIssue intermittent failure: spawn /bin/sh ENOENT

### Summary

Intermittent workflow failures occurred during the "Prepare local repository" step with the error: `Error: spawn /bin/sh ENOENT`. The failure was host-side (before any container was started) and only triggered on the retry path after a git operation failed. The root cause was using the target repository directory as the current working directory (cwd) for `git clone` immediately after that directory was deleted during cleanup.

### Reproduction conditions

- `shared/src/usecases/workflows/autoResolveIssue.ts` calls `setupLocalRepository` to prepare a local working copy before starting a container.
- `setupLocalRepository` performs git operations using helpers in `shared/src/lib/git.ts`.
- On transient git errors (fetch/reset), the retry path runs:
  - `cleanupRepo(baseDir)` which removes the repo directory (including the directory itself)
  - `cloneRepo(cloneUrl, baseDir)` which previously invoked `exec(command, { cwd: baseDir })`
- Because `baseDir` no longer exists post-cleanup, Node tries to spawn the shell with a non-existent cwd → `spawn /bin/sh ENOENT`.

This error was intermittent because most runs do not enter the cleanup/retry path; when they do, the first retry would fail with ENOENT. A subsequent run may succeed because the directory is recreated at the beginning of a new workflow.

### Changes implemented

- In both `shared/src/lib/git.ts` and `lib/git.ts`, `cloneRepo` now runs `git clone` with `cwd` set to the parent directory of the clone target when a target directory is provided:

```ts
const cwd = dir ? path.dirname(dir) : undefined
exec(`git clone ${cloneUrl}${dir ? ` ${dir}` : ""}`, { cwd })
```

- This ensures that cloning succeeds even if the target directory was removed by cleanup, eliminating the ENOENT condition.

### Alternative solutions considered

- Avoid host-side repo prep entirely and rely on in-container clone only.
  - Pro: Simplifies host requirements; fewer host-side tools needed.
  - Con: Increases network usage when the container re-clones on each run; we purposely copy the prepared host repo into the container when available to speed up subsequent steps.

- Use `spawn('git', ['clone', ...])` without a shell.
  - Pro: Avoids reliance on `/bin/sh` being present.
  - Con: Does not solve the invalid-cwd issue after cleanup; we would still need to ensure `cwd` exists. Keeping `exec` is acceptable here given we now use a valid parent cwd and sanitize inputs.

- Re-create the target directory before cloning and keep using it as `cwd`.
  - Pro: Also resolves ENOENT.
  - Con: Slightly more work and easier to get wrong; cloning into a path does not require the path to preexist when using the parent as `cwd`.

### Operational notes

- The failure occurred before container creation, aligning with UI status "Container: not_found" at the time of error.
- The worker Docker image already includes `git` and a shell; the host-side environment for the workflow worker is also properly provisioned. The issue was not missing binaries but a non-existent working directory during retry.

### Files touched

- `shared/src/lib/git.ts` – fix `cloneRepo` cwd to parent directory
- `lib/git.ts` – mirrored the same fix for app/server-side flows

### Expected impact

- Deterministic behavior during repository setup retries; no more intermittent `spawn /bin/sh ENOENT` when a cleanup occurs.


