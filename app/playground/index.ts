import express, { Request, Response } from 'express';
import { generateCode, createBranch, commitAndPush, createPullRequest } from './githubService';
import { getIssueDetails } from './issueService';

const app = express();

app.use(express.json());

// Endpoint to resolve an issue
app.post('/resolve', async (req: Request, res: Response) => {
  try {
    const { issueNumber } = req.body;
    if (!issueNumber) {
      return res.status(400).send({ message: 'Issue number is required' });
    }

    // Fetch issue details
    const issueDetails = await getIssueDetails(issueNumber);
    if (!issueDetails) {
      return res.status(404).send({ message: 'Issue not found' });
    }

    // Generate code for the issue
    const generatedCode = await generateCode(issueDetails);

    // Create and checkout new branch
    const branchName = `${issueNumber}-${issueDetails.title.toLowerCase().replace(/\s+/g, '-')}`;
    await createBranch(branchName);

    // Commit and push changes to the new branch
    await commitAndPush(branchName, generatedCode, `Resolve issue #${issueNumber}`);

    // Create a pull request with the latest changes
    const pullRequestUrl = await createPullRequest(branchName, issueNumber, issueDetails.title);

    // Return the URL of the created pull request
    return res.status(200).send({ pullRequestUrl });

  } catch (error) {
    console.error('Error resolving issue:', error);
    return res.status(500).send({ message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;