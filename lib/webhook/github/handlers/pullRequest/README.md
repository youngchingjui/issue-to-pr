Workflow authorization for GitHub PR interactions

This folder contains the webhook handlers that listen to GitHub pull request webhooks. In particular, comment.authorizeWorkflow.handler.ts is the gatekeeper for authorizing and triggering workflows from PR comments that contain the @issuetopr command.

Current behavior (PR comments)
- Event scope: Only issue_comment events on pull requests are considered. Pure issue comments are ignored by this handler.
- Bot safety: Comments authored by bots are ignored to prevent loops.
- Explicit signal: We only react to comments that include the trigger keyword "@issuetopr" (case-insensitive containment), to avoid noisy replies.
- Authorization rule: We allow the action when either of the following is true:
  - The commenter’s author_association is OWNER for the target repository, or
  - The repository is owned by an organization and the commenter is an organization admin for that org.
    - We detect org admins by calling GET /orgs/{org}/memberships/{username} and checking role === "admin".
    - For performance and predictable test behavior, we only attempt the org admin check when author_association === "MEMBER".
- Account requirement: The commenter must have an IssueToPR account with an LLM API key configured. If not, we post a helpful comment with a link to the settings page.
- Effects when authorized:
  - We acknowledge the comment with an "eyes" reaction immediately and a "rocket" after enqueueing.
  - We enqueue a createDependentPR job into the workers queue and post a confirmation comment with a link to track the workflow run.

Why org admins?
Some organization owners appear as MEMBER in author_association on organization-owned repositories. Previously, that prevented admins from using @issuetopr. We now explicitly permit users with the org admin role to trigger workflows on org-owned repos.

Extending this to other GitHub surfaces
We want a consistent, least-surprise model for authorizing workflow triggers initiated from GitHub. The same rules above should apply across entry points. Reasonable entry points include:
- PR review bodies (pull_request_review): A reviewer types @issuetopr in the review summary/comment. Apply the same checks, then trigger.
- PR review comments (pull_request_review_comment): Inline code comments on a PR. Apply the same checks, then trigger.
- Issue comments (issue_comment on issues): If we decide to support from issues, apply the same checks, then trigger workflows that make sense in issue context (e.g., summarizeIssue, plan changes, or createDependentPR if linked PR is unambiguous).
- Labels or other PR signals: For example, adding a specific label could trigger a workflow. In this case, use the actor who applied the label for the authorization check.

Implementation notes for other surfaces
- Use the installation-scoped Octokit for all checks.
- Derive the acting GitHub login and the repo owner/name from the webhook payload.
- Reuse the same authorization guard:
  1) Reject if bot, or if no explicit trigger keyword (for comment-based triggers).
  2) Authorize if author_association === OWNER.
  3) Otherwise, if author_association === MEMBER, check org admin role via orgs.getMembershipForUser.
  4) If authorized, require that the actor has an IssueToPR account with an API key.
  5) If all checks pass, enqueue the appropriate workflow and post a confirmation.

Human-readable test statements (acceptance scenarios)
- A PR comment "@issuetopr run" by a repo OWNER enqueues the workflow and posts a confirmation comment with a tracking link.
- A PR comment "@issuetopr run" by an organization admin (whose author_association is MEMBER) on an org-owned repo is accepted and enqueues the workflow.
- A PR comment "@issuetopr run" by a non-admin organization member is rejected with an authorization explanation.
- A PR comment "@issuetopr run" by a user with no IssueToPR account results in a guidance comment pointing them to sign in.
- A PR comment "@issuetopr run" by a user with an IssueToPR account but no API key results in a guidance comment pointing them to settings to add a key.
- A non-PR issue comment that includes @issuetopr is ignored by this handler with reason not_pr_comment.
- A PR comment without @issuetopr is ignored with reason no_command.
- A PR comment made by a bot is ignored with reason not_human_user.

Future considerations
- Repository-level permission checks (e.g., repo admins or collaborators with write) could be added if we want to permit more trusted roles than only repo owners and org admins.
- Rate limiting and abuse prevention for public repos may be required.
- Support for additional workflows from different entry points (e.g., reviews, review comments, issues) should share a common guard implementation to keep rules consistent.
