# Repository Cache

Workflows clone repositories to execute code changes. Cloning is slow for large repos. We cache cloned repos on the host to speed up subsequent workflow runs.

## How it works

1. Before a workflow starts, check if `/tmp/git-repos/{owner}/{repo}` exists
2. If it exists and is valid, use it (fetch latest changes)
3. If it doesn't exist or is corrupted, clone fresh

## Cache location

```
/tmp/git-repos/{owner}/{repo}
```

## Cache invalidation

- On clone/fetch failure: delete and re-clone
- No time-based expiration (disk space is cheap, network is slow)

## Failure handling

If cloning fails:

1. Delete any partial clone
2. Retry once
3. If still failing, report error to user and log for investigation

The cache is an optimization. Workflow correctness must not depend on cache state.
