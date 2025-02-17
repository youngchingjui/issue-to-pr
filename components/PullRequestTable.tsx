import React from 'react';
import { getPullRequestList } from '@/lib/github/pullRequests';
import { ReviewPullRequest } from '@/lib/tools/ReviewPullRequest';

interface Props {
  username: string;
  repoName: string;
}

export default async function PullRequestTable({ username, repoName }: Props) {
  try {
    const pullRequests = await getPullRequestList({ repo: repoName, per_page: 100 });

    if (pullRequests.length === 0) {
      return <p className="text-center py-4">No open pull requests found.</p>;
    }

    return (
      <div className="bg-white border border-gray-300">
        <div className="flex bg-gray-100 py-2 px-4">
          <div className="flex-1 font-bold">Pull Request</div>
          <div className="flex-1 font-bold">Comments</div>
          <div className="flex-1 font-bold">Review Status</div>
          <div className="flex-1 font-bold">Actions</div>
        </div>
        <div>
          {pullRequests.map((pr) => (
            <div key={pr.id} className="flex py-2 px-4 hover:bg-gray-50">
              <div className="flex-1">#{pr.number} {pr.title}</div>
              <div className="flex-1">{pr.comments} comments</div>
              <div className="flex-1">{pr.reviewStatus || 'Not Reviewed'}</div>
              <div className="flex-1">
                <button 
                  className="text-blue-500 hover:underline" 
                  onClick={() => ReviewPullRequest(pr.number)}
                >
                  Let AI generate review your PR
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <p className="text-center py-4 text-red-500">
        Error: {(error as Error).message}
      </p>
    );
  }
}