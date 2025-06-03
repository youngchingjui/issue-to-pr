---
title: Why Issue To PR?
date: 2025-06-03
Summary: Issue To PR is a Github-native application that immediately generates Pull Requests from your Github issues by analyzing your codebase, generating a Plan, and implementing those fixes.
---

Issue To PR immediately generates Pull Requests from your Github issues by analyzing your codebase, generating a Plan, and implementing those fixes.

## How It Works

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

### GitHub-Native Integration

Issue To PR is built using GitHub's APIs and security model, providing nearly full-sync with GitHub. You continue managing your project through GitHub's Issues and PRs while Issue To PR responds automatically. It works with your existing repository permissions, branching strategies, and development workflow without requiring changes to your process.

### Simultaneous PR Generation

Multiple PRs are generated simultaneously in the background. When you create multiple issues at the same time, they all work independently—no need to wait for responses or work on a single thread. PRs are ready for review just minutes after creating the issue.

### Quality Assurance

- Unit tests are automatically generated to speed up PR review time
- Code changes are iterated to pass your existing unit tests
- Linting configuration is followed to maintain code standards
- Generated PRs include proper descriptions, linked references, test results, and clear explanations of changes

## Automatically generate PRs for each new Issue

Workflow runs provide detailed traces of the agents' actions. You can view the files loaded, the considerations made, and the complete decision-making process, ensuring full visibility into how your code changes were determined.

## Iterative Improvement

### Automatic PR Fixes from Review Comments

After you submit a PR review, an Issue To PR agent automatically:

- Reviews the PR and your comments
- Examines the underlying issue and original Plan
- Identifies discrepancies in the Plan
- Updates the Plan to align with your review comments
- Implements updates to the PR based on the revised plan

This workflow delivers 3x better quality and consistency compared to regular "in-chat fixes."

### Plan Updates via Issue Comments

Adjust Plans directly within GitHub by posting comments on the issue and mentioning "@issue-to-pr". The agent will:

- Review your comment and the underlying issue
- Make adjustments to the Plan accordingly
- Implement changes based on your feedback

## Why Choose Issue To PR

### Speed and Quality

What typically takes hours of context switching, analysis, coding, and PR creation now happens in minutes. Issue To PR automates the repetitive parts of bug fixing while keeping developers in control of important decisions. It reduces context switching and saves time without compromising code quality or security.

### Bottom Line

Issue To PR transforms GitHub issues into production-ready pull requests automatically, letting you focus on code review and strategic decisions rather than implementation details.

## Getting Started

Install the Issue To PR GitHub App to enable automatic Plan and PR creation for your repositories. The app integrates seamlessly with your existing GitHub workflow and begins working immediately on new issues.
