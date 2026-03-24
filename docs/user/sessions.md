# Sessions

> This doc describes the **ideal state** of the feature. It may not reflect the current implementation.

## What this feature does

A session is a live, interactive context tied to a workflow run. Users can watch agent output in real time, send messages while the agent is still working, and step away without losing progress — the session continues running in the background.

## User stories

- As a user, I want to watch the agent work in real time so I understand what it's doing, not just see the final result.
- As a user, I want to send the agent a message while it's still running so I can provide additional context or steer its approach.
- As a user, I want to close my browser and come back later without losing the session so I'm not forced to stay on the page.
- As a user, I want to approve or reject risky actions (like pushing code) before the agent takes them so I stay in control.
- As a user, I want to see the full history of a completed session so I can review what the agent did and why.

## Goals

- **Transparency** — Users should never wonder "what is the agent doing right now?"
- **Control** — Users can influence the agent mid-run, not just configure it at the start.
- **Resilience** — Sessions survive client disconnections. The agent keeps working; the user reconnects when ready.
- **Trust** — By watching the agent and approving key actions, users build confidence in the results.

## What users can do

- Start a workflow and immediately see a live session view
- Watch the agent's progress as it reads files, makes decisions, and writes code
- Send messages to the agent at any point during the session
- Approve or reject actions the agent flags for review
- Leave and return to an active session from any device
- Review the full transcript of a completed session

## Open questions

- What does the session UI look like? A chat-like view, a terminal-like log, or something else?
- Can multiple users watch or interact with the same session?
- What gets persisted after a session ends — full transcript, summary, or just the final result?
- What happens when the agent asks for input but no user is connected? Does it timeout, skip the step, or queue the question?
- Should users be able to configure which actions require their approval?
- How do sessions work for webhook-triggered runs where there is no active user at the start?
