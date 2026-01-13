---
title: Why Issue To PR?
date: 2025-06-03
Summary: Issue To PR is a Github-native application that immediately generates Pull Requests from your Github issues by analyzing your codebase, generating a Plan, and implementing those fixes.
---

Issue To PR immediately generates Pull Requests from your Github issues by analyzing your codebase, generating a Plan, and implementing those fixes.

## Issue To PR Transforms Issues Into Pull Requests

When you have a GitHub issue, Issue To PR does the following:

1. **Reads the problem description** from your GitHub issue
2. **Analyzes your repository** to understand the codebase structure and uses agentic reasoning to load files relevant to the issue
3. **Generates a thorough Implementation Plan** that includes:
   - Identification of the issue
   - List of evidence from the codebase
   - Detailed plan to resolve the issue
4. **Implements the changes** following the plan:
   - Creates and edits files on a new branch
   - Automatically fixes linting errors (coming soon)
   - Generates unit tests with a separate agent (coming soon)
   - Iterates to ensure code passes tests (coming soon)
5. **Creates a pull request** with detailed explanations and proper descriptions

The agents handle issues of all types, from bug fixes to full feature requests. Larger requests start with code scaffolding that you can iterate on with additional issues.

## Key Features

### Generates Plan for each issue

Issue To PR automatically generates a Plan for each issue. This Plan includes:

- Identification of the issue
- List of evidence from the codebase
- Detailed plan to resolve the issue
- Highlights of assumptions made, so you can easily review and update

With the Plan, the implemented PR is much more likely to be correct.

### Integrates Directly With Your Existing GitHub Workflow

Issue To PR is built using GitHub's APIs and security model, providing nearly full-sync with GitHub. You continue managing your project through GitHub's Issues and PRs while Issue To PR responds automatically. It works with your existing repository permissions, branching strategies, and development workflow without requiring changes to your process.

### Generates Multiple PRs Simultaneously

Multiple PRs are generated simultaneously in the background. When you create multiple issues at the same time, they all work independently—no need to wait for responses or work on a single thread. PRs are ready for review just minutes after creating the issue.

### Automatically Improves Code Quality

- Agents generate unit tests for each PR to speed up review time
- Agents iterate over the code changes to pass your existing unit tests
- Agents fix linting errors to maintain code standards
- Generated PRs include proper descriptions, linked references, test results, and clear explanations of changes

### View Agents Actions and Reasoning With Traceable Records

Workflow runs provide detailed traces of the agents' actions. You can view the files loaded, the considerations made, and the complete decision-making process, ensuring full visibility into how your code changes were determined.

## Iterative Improvement

### Agents Automatically Fix PRs Based on Your Review Comments

After you submit a PR review, an Issue To PR agent automatically:

- Reviews the PR and your comments
- Examines the underlying issue and original Plan
- Identifies discrepancies in the Plan
- Updates the Plan to align with your review comments
- Implements updates to the PR based on the revised plan

This workflow delivers 3x better quality and consistency compared to regular "in-chat fixes."

### Update Plans Through Issue Comments

Adjust Plans directly within GitHub by posting comments on the issue and mentioning "@issue-to-pr". The agent will:

- Review your comment and the underlying issue
- Make adjustments to the Plan accordingly
- Implement changes based on your feedback

## Issue To PR Saves Time While Maintaining Quality

### Issue To PR Delivers Both Speed and Quality

What typically takes hours of context switching, analysis, coding, and PR creation now happens in minutes. Issue To PR automates the repetitive parts of bug fixing while keeping developers in control of important decisions. It reduces context switching and saves time without compromising code quality or security.

### Issue To PR Transforms Your Development Workflow

Issue To PR transforms GitHub issues into production-ready pull requests automatically, letting you focus on code review and strategic decisions rather than implementation details.

## Install Issue To PR to Start Generating PRs

Install the Issue To PR GitHub App to enable automatic Plan and PR creation for your repositories. The app integrates seamlessly with your existing GitHub workflow and begins working immediately on new issues.

## How Issue To PR Differs From IDE Agents

Issue To PR operates differently from IDE agents like Cursor:

- **No manual prompting required** - Issue To PR automatically executes optimized workflows without needing "continue" or "make a plan" prompts at each step.
- **Parallel development** - Multiple issues generate PRs simultaneously rather than requiring sequential chat interactions.
- **Focus shifts to code review** - Your primary work becomes reviewing completed PRs instead of guiding AI through implementation steps.
- **Built-in quality assurance** - Automated unit tests eliminate uncertainty about whether code works, removing the need to explicitly request testing.
