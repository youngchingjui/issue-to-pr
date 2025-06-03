---
title: Why Issue To PR?
date: 2025-06-03
Summary: Issue To PR is a Github-native application that immediately generates Pull Requests from your Github issues by analyzing your codebase, generating a Plan, and implementing those fixes.
---

Issue To PR immediately generates Pull Requests from your Github issues by analyzing your codebase, generating a Plan, and implementing those fixes.

## How It Works

When you have a GitHub issue, Issue To PR reads the problem description, analyzes your repository to understand the codebase structure, identifies the files that need changes, implements the fix, runs tests, and creates a pull request with detailed explanations.

## Github-native application

- Issue to PR is native to Github and has nearly full-sync with Github.
- Continue managing your project through Github's Issues and PRs, and Issue To PR will respond automatically

## Scanning your codebase

The agent is given a detailed breakdown of your codebase.
The agent thoroughly loads files that may be relevant to the issue at hand.

## Generating a Plan

The agent generates a thorough Implementation Plan that includes:

- Identification of the issue
- List of evidence from the codebase
- Plan to resolve the issue
- No need for additional prompting such as "yes, please continue with the plan" or "please generate a plan".

## Implementing the Plan

- The Agent closely follows the Plan to implement the changes.
- Changes are created on a new branch, automatically named
- Changes will follow your linting configuration (coming soon)
- A separate agent generates unit tests
- The agent will iterate over the code changes so they pass your unit tests (coming soon)
- The agent will iterate over the code changes so they pass your linting tests (coming soon)

##

These agents work on issues of all types. From bug fixes all the way to full feature requests.
Larger requests will start with code scaffolding, with weaker details.
You can continue iterating on the details of the scaffolding with further issues.

## Automatically generate PRs for each new Issue

## Unit tests to speed up PR review time

## Install the Issue To PR Github App for automatic Plan and PR creation

## Multiple PRs are generated simultaneously

- No need to work on a single thread to wait for response. PRs will be ready for you just a few minutes after creating the issue. If you create multiple issues at the same time, they will all work in the background simultaneously.

## Transparent Process

Workflow runs provide detailed traces of the Agents' actions. You can view the files it's loaded, the consideratinos it's made, and its decision-making process.

## Automatically fix PRs with PR review comments

- After submitting a review, an agent will autoamticaly review the PR, the comments, the underlying issue and Plan, and identify where in the Plan there was a discrepancy.
- It'll then update the Plan to better align with your Review Comments.
- With the updated plan, it'll then make updates to the PR.
- This workflow is 3x better and more consistent in quality than regular "in-chat fixes".

## Update Plans with comments within Github issue comments

- If there's some details in the Plans you'd like to change, just post a comment below the plan and "@issue-to-pr".
- The agent will review your comment, review the underlying issue, and make adjustments to the Plan.

## Speed and Quality

What typically takes hours of context switching, analysis, coding, and PR creation now happens in minutes. The generated PRs include proper descriptions, linked references, test results, and clear explanations of changes.

## GitHub Integration

Built using GitHub's APIs and security model. Works with your existing repository permissions, branching strategies, and development workflow without requiring changes to your process.

## Bottom Line

Issue To PR automates the repetitive parts of bug fixing while keeping developers in control of the important decisions. It reduces context switching and saves time without compromising code quality or security.
