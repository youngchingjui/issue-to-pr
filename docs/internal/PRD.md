## The Problem

One user was surprised to see workflows that they did not run when visiting the "Workflows" page. They likely saw workflows that were run on a public repository such as "youngchingjui/issue-to-pr".

## Goal

We need to update the workflow runs shown to the user in a way that is least surprising to them.

## Context

A workflow run can be initiated by:

- A user clicking the "Resolve issue" button on an issue from within the Issue To PR app.
- A user clicking any of the options from the "Launch workflow" drop down from the repo's Issues or Pull Requests listing page.
- A user or another authorized Github user adding a label to an issue or PR on Github, which triggers a webhook to launch a workflow run through workers.

## Steps

Workflow runs need some additional attribution. This data needs to be saved on neo4j in a data model that makes sense.

Ways to attribute a workflow run include:

- actor
- trigger type
- etc.

The actor could be the authenticated user in our Issue to PR app, or they could be an authorized GitHub user who added a label to an issue or pull request on the GitHub repository.

We should probably design a policy that decides: "Can User U in Workspace W list / view_details / view_logs for Workflow Run R?"

There are a few ways to enable visibility of the workflow runs too. The strictest is just showing the user's own initiated workflow runs.

But we'd also like to operate on the "Principle of Least Surprise". So we'll have to determine what is least surprising for the user, and cater the UI/UX to that paradigm.

For example, a user might be looking to see all workflow runs for the repo that they have access to, perhaps including workflow runs initiated by a team mate. So we'll need to review if that data should be viewable and/or editable by the user.

We may need to also establish workspace / tenancy within Issue To PR, that is separate from the Github's tenancy structure.

This way the user or administrator can have better control over who has control over what resources on the Issue To PR side, including viewing and launching workflow runs.

---

You can make this much less fuzzy if you treat “workflow run visibility” as an authorization problem over a well-defined resource.

1. Define the resource and the attributes you’ll authorize on

Resource: WorkflowRun

Key attributes you should store (or be able to derive) for every run:
• repo_id / repo_full_name
• installation_id (which GitHub App installation it ran under)
• workspace_id / tenant_id (your app’s org/team/project that “owns” the connection)
• trigger_type: app_ui, label_issue, label_pr, push, schedule, etc.
• trigger_actor_github_id (who labeled / pushed / etc., if available)
• initiator_user_id (your app user who clicked “Run agent”, if applicable)
• run_context: branch/sha, PR/issue number, environment, secrets scope, etc.
• created_at, status, logs links (and whether logs include sensitive output)

Then, design authorization as a policy that decides:

Can User U in Workspace W list / view_details / view_logs for WorkflowRun R?

Those three actions often need different rules (listing is lower risk than logs).

⸻

2. Decide what “should” drive visibility (pick a primary security boundary)

There are three common boundaries. Each is defensible, but they lead to different UX/security outcomes:

Option A — Repo-based (“if repo connected, show all runs”)

Rule: If the repo has your GitHub App installed (and is connected), any user in the workspace can see all runs for that repo.

Pros
• Best debuggability: teams see everything happening on their repos
• Simple mental model: “repo page == all activity”
• Avoids confusion when runs are triggered by events (labels, pushes)

Cons / Risks
• If your workspace membership ≠ GitHub repo membership, you can leak activity to people who shouldn’t see it
• Especially dangerous if logs contain code, secrets, stack traces, or file diffs
• Makes off-platform triggers (labels by teammates) visible to everyone, even if they’re not GitHub-collaborators

When it works: Your workspace is strictly mapped to a GitHub org/team and membership is synced/enforced.

⸻

Option B — GitHub-permission-based (“only show runs if user can access repo in GitHub”)

Rule: User can see runs only if they currently have GitHub access to that repo (typically at least read/triage), and are in your workspace.

Pros
• Strong alignment with GitHub’s source-of-truth permissions
• Minimizes leakage across repos/teams
• Handles teammate-triggered labels naturally: if you can access repo, you can see what happened

Cons
• Requires reliable GitHub permission checks (and caching)
• Edge cases: user removed from repo after run; do you retroactively hide runs?
• GitHub permissions are nuanced (org SSO, outside collaborators, private forks)

When it works: You can routinely query membership/permissions or maintain a good permission cache, and you want GitHub to be your primary access control system.

⸻

Option C — Initiator-based (“only show runs you started”)

Rule: User sees only runs where they were the initiator (clicked run in your UI) or were the event actor (added the label).

Pros
• Maximum privacy / minimal accidental disclosure
• Dead-simple to explain: “your runs”

Cons
• Terrible team debuggability: teammates can’t see why “the agent is doing things”
• Breaks down when runs are triggered by other actors/events (you’ll hide important activity)
• Encourages duplicated work (“I can’t see what happened, I’ll rerun it”)

When it works: Your product is primarily personal (not team), and runs/logs can be sensitive.

⸻

3. A practical default: a hybrid with two layers (tenant boundary + GitHub access), plus role-based “logs” gating

Most products end up here:

Recommended policy 1. Tenant/workspace boundary: user must belong to the workspace/project that connected the repo (workspace_id on the run). 2. GitHub repo access boundary: user must currently have at least read/triage access to the repo on GitHub. 3. Action-based tightening:
• list: allow with (1) + (2)
• view_details: allow with (1) + (2)
• view_logs (and anything that can expose sensitive output): require (1) + (2) + stronger role, e.g. “Maintainer/Admin in workspace” or “Write/Maintain in GitHub”

This gives you:
• Team visibility (including label-triggered runs by teammates)
• Minimal leakage outside GitHub’s permission model
• A safety valve if logs are the risky part

If you want a smoother UX: let users see that a run exists (list) but hide logs unless they meet the higher bar.

⸻

4. How to “map it out”: build a small decision matrix + threat model

Step 1 — Write 5–8 concrete user stories (these drive everything)

Example set:
• A maintainer wants to see all runs for their repo, regardless of trigger.
• A teammate labels an issue; others want to see that run for debugging.
• A contractor has access to your workspace but not the GitHub repo—should they see anything?
• A user is removed from the repo—should they still see historic runs?
• A repo is disconnected/uninstalled—what happens to old runs?

Step 2 — Make a matrix: rows = stories, columns = policy options

For each cell, score:
• ✅ Security
• ✅ Debuggability
• ✅ Ease to explain
• ✅ Implementation complexity
• ✅ “Least surprise” for users

Step 3 — Explicitly decide what’s sensitive

If logs can include secrets, proprietary code diffs, stack traces, treat view_logs as a privileged action. If logs are already sanitized/redacted, you can loosen.

⸻

5. Implementation tips (so the policy is enforceable)
   • Persist workspace_id on the run at creation time (don’t infer later).
   • Store both initiator_user_id and trigger_actor_github_id when possible (helps audit + “why did this run happen?”).
   • Maintain a permission cache keyed by (user_github_id, repo_id) with a TTL (e.g., minutes/hours) and an on-demand refresh when a user tries to access.
   • Decide the rule for historic access:
   • Strict: if you lose GitHub access, you lose run visibility immediately.
   • Lenient: you keep access to runs you initiated (but not others). This is a common compromise.

⸻

6. A clean way to present it in the UI

On the runs page, consider filters that match your policy:
• “All runs in connected repos (I have access)”
• “Runs I started”
• “Runs triggered by me (label/push)”

And in each run detail:
• “Triggered by: label added by @alice”
• “Initiated from app by: Ching Jui”
• “Repo access required to view logs” (if logs are gated)

This reduces surprise and support tickets.

⸻

If you tell me two things, I can recommend a sharper “final” policy: 1. Are your workspaces 1:1 with a GitHub org, or can they mix repos across orgs/users? 2. Do your logs ever contain code diffs or secrets, or are they sanitized? 3.

---

If you’re optimizing for “least surprise” on day 1, Option C (only runs you initiated) is usually the safest default — but only if you make one thing very explicit in the UI:

“This page shows runs started by you.”

Because the most surprising failure mode isn’t “I can’t see my teammate’s run” — it’s “I can see activity I didn’t cause and don’t understand / didn’t expect to be visible.”

That said, Option C has a second “least surprise” trap: event-triggered runs.

Where Option C can feel surprising
• A run is triggered by a label, but the label was added by a GitHub automation (or a teammate), so the user sees nothing and thinks “the system didn’t work.”
• A teammate starts a run on “their” branch/PR and the user can’t find it, even though it impacts the same repo the user’s staring at.

If you go with Option C, you can keep least-surprise by adding two small UX guardrails:

Make Option C feel intuitive 1. Default filter = “Started by me”
But keep the page title/empty-state copy brutally clear. 2. Show “hidden activity exists” without revealing details (optional but powerful)
• Example banner: “There are other runs in this repo you don’t have access to on this page.”
• Or: “Showing your runs. Switch to ‘All accessible runs’ (coming soon).”
This avoids users thinking runs “didn’t happen.” 3. Have an audit trail on every run
• “Initiated from app by …”
• “Triggered by label added by …”
Even within “my runs,” this reduces confusion when triggers aren’t the same as initiator.

Your “Option C now, Option B later” plan is solid — with one tweak

I’d frame it as progressive disclosure:
• Phase 1 (now): Listing page shows “My runs” (initiator = me).
• Phase 2: Add an “All runs I can access” view (Option B-ish) gated by GitHub repo access + workspace membership.
• Phase 3: Add admin/team observability (repo-wide runs, org-wide runs, etc.), plus stronger log permissions.

The tweak: design your data model today so Phase 2 is easy:
• always store repo_id, installation_id, workspace_id, trigger_actor, initiator.
If you don’t, you’ll hate yourself later.

The one thing I’d avoid

Don’t ship Option C without either:
• clear labeling (“My runs”), or
• a breadcrumb that indicates runs can exist outside this view.

Otherwise users will file “bug: agent didn’t run” when it actually did.

If you want, I can propose exact copy + the filter layout (tabs vs dropdown) that makes “least surprise” work really well for this page.

---

You’re thinking about it the right way: in Neo4j, the “ethos” is explicit relationships + queryable properties, not shoving a blob of JSON somewhere.

Default rule of thumb
• Make it a node if it’s an entity you’ll link to, reuse, permission-check against, or query across many runs.
• Make it a property if it’s scalar, run-specific, and you mostly filter/sort on it.
• Don’t make a generic (:Metadata) node unless you have a concrete need (it often becomes an untyped junk drawer and makes queries slower/messier).

What I’d do for workflow runs

Nodes (entities)

These are almost always worth being nodes because they’re stable, shared, and permission-relevant:
• (:WorkflowRun {id, github_run_id, created_at, status, conclusion, ...})
• (:Repository {id, full_name, provider:"github"})
• (:Installation {id, github_installation_id}) (your GitHub App installation)
• (:Workspace {id, ...}) (your tenant boundary)
• (:User {id, github_user_id, ...})
• Optional: (:PullRequest {number, repo_id}), (:Issue {number, repo_id}) if you want deep linking and cross-run queries

Relationships (the graph part)

Model the “who/where/why” as edges:
• (wr)-[:ON_REPO]->(repo)
• (wr)-[:UNDER_INSTALLATION]->(inst)
• (wr)-[:IN_WORKSPACE]->(ws) (or derive via repo↔workspace if you have that mapping)
• (wr)-[:INITIATED_BY]->(user) (only when launched from your app)
• (wr)-[:TRIGGERED_BY]->(user) (GitHub actor, if it’s a human; optional)
• (wr)-[:ON_PR]->(pr) or (wr)-[:ON_ISSUE]->(issue) when relevant

This structure makes your eventual Option B permission checks much cleaner:
• “user is in workspace” is a hop
• “run is on repo” is a hop
• “repo is connected under installation” is a hop

What should be properties on WorkflowRun

These are great as top-level properties on the WorkflowRun node (no JSON needed):
• trigger_type (string enum: "app_ui" | "label_issue" | "label_pr" | "push" | ...)
• created_at, updated_at
• status, conclusion
• head_sha, head_branch (if you need them)
• github_run_attempt, run_number (if applicable)
• visibility_level (optional, if you precompute policy outcomes)
• Anything you filter/sort on frequently

If you ever find yourself wanting to store a nested structure, it’s usually a sign you should either:
• normalize it into nodes/relationships, or
• drop it into your relational/document store instead of Neo4j.

When a separate “metadata node” does make sense

If you have highly variable, sparse, arbitrary key/value fields that:
• differ across trigger types, or
• are only occasionally present,
and you still want them queryable, a better pattern than JSON is a typed key-value model:
• (:WorkflowRun)-[:HAS_ATTR]->(:RunAttr {k:"label", v:"run-agent"})

But I’d only do this if you truly need ad-hoc querying across arbitrary keys. Otherwise, it adds overhead and complexity fast.

Labels vs properties
• Use labels for broad categories you’ll index differently or treat differently in queries:
• :WorkflowRun, :Repository, :User, etc.
• (Maybe) :GitHubRepository if you also support GitLab later.
• Use properties for “type within the same concept”:
• trigger_type as a property is usually better than labels like :TriggeredByLabel.
• Same with status, conclusion.

Practical performance note

For the listing page you described, you’ll probably want indexes/constraints like:
• WorkflowRun(id) unique
• WorkflowRun(created_at) index (or composite with workspace/repo depending on query)
• Repository(id) unique, Repository(full_name) index
• User(id) unique, User(github_user_id) index
• Installation(github_installation_id) unique

Bottom line recommendation

Start with:
• WorkflowRun node with scalar properties
• Explicit edges to repo/workspace/user/installation
• Avoid a generic Metadata node
• Only introduce a key/value attribute subgraph if you hit a real, recurring need

If you share the two or three exact listing queries you need (e.g., “My runs”, “All accessible runs”, “Runs for repo X”), I can suggest the cleanest relationship directions + indexes to make those queries fast and readable.
