import issuesLabeledResolve from "./issues.labeled.resolve.json"
import issuesLabeledAutoResolve from "./issues.labeled.auto-resolve.json"
import pullRequestLabeled from "./pull_request.labeled.json"
import pullRequestClosedMerged from "./pull_request.closed.merged.json"
import issueCommentCreatedPr from "./issue_comment.created.pr.json"
import installationCreated from "./installation.created.json"
import installationRepositoriesAdded from "./installation_repositories.added.json"
import repositoryEdited from "./repository.edited.json"

/**
 * GitHub webhook payload fixtures for testing
 *
 * These fixtures represent realistic GitHub webhook payloads that can be used
 * in tests to verify webhook route handling and business logic.
 */
export const webhookFixtures = {
  issues: {
    labeled: {
      resolve: issuesLabeledResolve,
      autoResolve: issuesLabeledAutoResolve,
    },
  },
  pullRequest: {
    labeled: pullRequestLabeled,
    closed: {
      merged: pullRequestClosedMerged,
    },
  },
  issueComment: {
    created: {
      pr: issueCommentCreatedPr,
    },
  },
  installation: {
    created: installationCreated,
  },
  installationRepositories: {
    added: installationRepositoriesAdded,
  },
  repository: {
    edited: repositoryEdited,
  },
}

export type WebhookFixtures = typeof webhookFixtures
