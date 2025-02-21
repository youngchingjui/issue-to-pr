import { getPullRequestComments, createPullRequestComment } from '@/lib/github/pullRequests';
import getOctokit from '@/lib/github';
import { Octokit } from '@octokit/rest';
import { GitHubRepository } from '@/lib/types';

interface CommentOnPullRequestParams {
  repo: GitHubRepository;
  pullNumber: number;
  commentText: string;
}

/**
 * Comments on a specific pull request using GitHub API.
 *
 * @param {CommentOnPullRequestParams} params - Parameters to comment on a pull request
 * @returns {Promise<any>} - Result of the comment creation API call
 */
async function commentOnPullRequest({
  repo,
  pullNumber,
  commentText,
}: CommentOnPullRequestParams): Promise<any> {
  const octokit: Octokit = await getOctokit();
  const [owner, repoName] = repo.full_name.split('/');

  try {
    const commentResponse = await octokit.issues.createComment({
      owner,
      repo: repoName,
      issue_number: pullNumber,
      body: commentText,
    });

    console.log('Comment posted on PR:', commentResponse.data.url);
    return commentResponse.data;
  } catch (error) {
    console.error('Failed to post comment on PR:', error);
    throw new Error('CommentOnPullRequest: Could not post comment');
  }
}

export default commentOnPullRequest;
