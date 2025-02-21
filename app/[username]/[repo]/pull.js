import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import commentOnPullRequest from '@/lib/workflows/commentOnPullRequest';

export default function PullRequestDetail() {
  const router = useRouter();
  const { username, repo, pullNumber } = router.query;
  const [pullRequest, setPullRequest] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchPullRequestDetails = async () => {
      // Fetch pull request details from your backend
      const response = await fetch(`/api/github/pulls/${username}/${repo}/${pullNumber}`);
      const data = await response.json();
      setPullRequest(data);
    };
    
    if (username && repo && pullNumber) {
      fetchPullRequestDetails();
    }
  }, [username, repo, pullNumber]);

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    const session = await getSession();

    if (!session) {
      router.push('/api/auth/signin');
    } else if (pullRequest) {
      try {
        const { repo: repoDetails } = pullRequest;
        await commentOnPullRequest({ repo: repoDetails, pullNumber, commentText: comment });
        // Handle comment submitted successfully
      } catch (error) {
        console.error('Error submitting comment:', error);
      }
    }
  };

  if (!pullRequest) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {pullRequest.title}
      </h1>
      <p>{pullRequest.body}</p>

      <form onSubmit={handleCommentSubmit}>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment"
          required
          className="border rounded p-2 mb-4 w-full"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Comment
        </button>
      </form>
    </div>
  );
}
