---
title: "Twitter Thread: Issue To PR (PAS Framework)"
date: 2025-06-03
Summary: A long-form Twitter thread repurposed from the 'Why Issue To PR?' blog post, using the Problem-Agitate-Solve framework.
---

### Twitter Thread: My Journey from Early Cursor User to Building Issue To PR

**Tweet 1/15 (Problem)**

I started using Cursor in early 2024.

It immediately sped up my development by 50%. I was shipping faster than ever.

But after months of daily use, I kept running into the same frustrating patterns.

---

**Tweet 2/15 (Problem)**

I found myself writing the same prompts over and over:

"Please make a plan before implementing."
"Please include unit tests."
"Please do a thorough search through the codebase before making suggestions."

Why was I constantly re-prompting for basic best practices?

---

**Tweet 3/15 (Problem)**

The single-threaded workflow was killing me.

Work on a problem → wait 30 seconds → give feedback → wait another 30 seconds → iterate.

Meanwhile, my GitHub issues were piling up, each requiring the same manual copy-paste-and-wait cycle.

---

**Tweet 4/15 (Agitate)**

I started creating plan.md files for every feature.

These plans were actually _amazing_—starting with vague ideas and letting AI fill in details I could review and refine.

But managing dozens of plan files across projects became unwieldy.

---

**Tweet 5/15 (Agitate)**

Here's what really frustrated me:

My GitHub already had issues with clear descriptions. My codebase was right there.

Why was I copying and pasting each issue into chat and waiting 1-2 minutes per feature when I had everything needed to resolve them?

---

**Tweet 6/15 (Realization)**

That's when it hit me: there's a better way to use agents.

The issue descriptions and codebase had all the context needed to resolve most problems. We could spawn dozens of agents to simultaneously work on each issue.

---

**Tweet 7/15 (Transition)**

Instead of me being the bottleneck, copying issues into chat one by one, what if agents could:

- Automatically read GitHub issues
- Generate implementation plans (like my beloved plan.md files)
- Work on multiple issues in parallel
- Create PRs ready for review

---

**Tweet 8/15 (Solve)**

So I built Issue To PR.

It's what I wished Cursor could do—agents working in the background on GitHub issues, automatically creating the plans and PRs I was manually orchestrating.

---

**Tweet 9/15 (How it Works)**

When you create an issue, Issue To PR automatically:

1.  **Reads the problem description**
2.  **Analyzes your repository and codebase**
3.  **Generates a detailed Implementation Plan** (just like those plan.md files I loved)

You can review and adjust the plan by commenting on the issue.

---

**Tweet 10/15 (How it Works)**

Once the Plan is approved, Issue To PR:

4.  **Implements the changes** on a new branch
5.  **Creates a pull request** with detailed descriptions
6.  **Links everything back** to the original issue

No more copy-pasting. No more waiting in chat.

---

**Tweet 11/15 (Key Feature: The Plan)**

The automatically generated Plan solved my plan.md file problem.

It lists codebase evidence and outlines proposed changes _before_ writing code. You can review and refine it directly in the GitHub issue.

No more scattered plan files.

---

**Tweet 12/15 (Key Feature: Parallel Work)**

This fixes the single-threaded problem I had with Cursor.

Create five issues, and five agents work on them simultaneously in the background. No waiting. No sequential chat management.

Just PRs ready for review when you're ready.

---

**Tweet 13/15 (Key Feature: GitHub Native)**

Issue To PR works within your existing GitHub workflow.

- No changes to your process
- Respects existing repository permissions
- You manage everything through Issues and PRs, just like always

No new tools to learn.

---

**Tweet 14/15 (Reality Check)**

This week Cursor v1.0 launched background agents. OpenAI opened Codex to ChatGPT Plus users with async PR creation.

Honestly, this changes things. The big players just built what I was working on.

---

**Tweet 15/15 (What's Different)**

Issue To PR still does three things the others don't:

1. Automatic implementation plans you can review before any code changes
2. Complete unit test generation
3. Works faster than Cursor's current workflow

But I'm not pretending this market didn't just get more competitive.

---

**Tweet 16/15 (Direct Ask)**

If you want to test whether Issue To PR speeds up your development more than your current Cursor workflow, DM me.

I'll send you free OpenAI credits to try it on your repos.
