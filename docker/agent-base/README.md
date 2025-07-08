# Agent Base Container: Node.js & pnpm Only

## IMPORTANT: Use pnpm, Not npm

This container image provides Node.js 22, npm, and pnpm, but **you must use `pnpm` for all Node.js package management** inside this environment:

- `npm install` is **not supported** and will often result in dependency errors due to strict (and incompatible) peer dependency resolution in many codebases.
- Use `pnpm install` or `pnpm` for all install, test, and dev scripts, as required by this and most tightly-managed monorepos.

See the project [README.md](../../README.md) for details.

## Why?

- `pnpm` enforces stricter, more reliable dependency management and is required by this codebase (as well as many others following modern best practices).
- You will encounter errors like `npm ERR! ERESOLVE unable to resolve dependency tree` if you run `npm install`.

## Workspace Directory & Git Ownership

- The default working directory is `/workspace`.
- This directory is forcibly owned by the `node` user and configured as a Git safe.directory to prevent Git dubious ownership warnings inside the container (especially when using Docker volumes).

---

**Summary:**
- Always use `pnpm`, never `npm` for Node.js package operations in this image.
- If you get a git ownership warning, it is likely due to volume mounts and should be addressed via Docker user options or further configuring Git safe.directory.

