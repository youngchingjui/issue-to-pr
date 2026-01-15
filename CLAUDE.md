# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- Look for commands in package.json to understand how to run testing and linting.
- For typescript, avoid typecasting. If you're resorting to typecasting, it's usually a sign you haven't thought carefully enough about the inferred type. We want this codebase to be as strongly typed as possible.

- This is a monorepo. The NextJS application currently sits in the root directory, with files in the /components and /lib directories supporting it. But we'd like to move the NextJS application to the /apps/web directory.
- We have a /shared folder where shared code between the NextJS application and the workers lives.
- Be sure to refer to config files to see how we run scripts, run typechecks, etc.
- We want good, clean code
- We want easy, clear code file organization. Any new joiner should be able to quickly understand where to find a file.
- We'll scatter additional specific guidance throughout the codebase. Look for README.md in nested folders, sitting close to any code they might be referencing.
- When reviewing files or editing files, try to look for any relevant README.md files nearby that might give context about the direction of the code.
