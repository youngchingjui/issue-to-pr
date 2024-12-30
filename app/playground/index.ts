import express, { Request, Response } from 'express';
import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';

const app = express();
app.use(express.json());

// Initialize Octokit with personal access token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// /resolve endpoint
app.post('/resolve', async (req: Request, res: Response) => {
  const { issueNumber, issueTitle, repository, owner } = req.body;

  if (!issueNumber || !issueTitle || !repository || !owner) {
    return res.status(400).send('Required parameters are missing');
  }

  const branchName = `${issueNumber}-${issueTitle.replace(/\s+/g, '-').toLowerCase()}`;

  try {
    // Step 1: Generate code
    const generatedCode = generateCodeForIssue(issueNumber); // Implement this function as needed

    // Step 2: Create a new branch
    execSync(`git checkout -b ${branchName}`);

    // Step 3: Add and commit changes
    execSync('git add .');
    execSync(`git commit -m "Resolved issue #${issueNumber} - ${issueTitle}"`);

    // Step 4: Push the branch
    execSync(`git push origin ${branchName}`);

    // Step 5: Create a pull request
    const pullRequest = await octokit.pulls.create({
      owner,
      repo: repository,
      title: `Fix: #${issueNumber} - ${issueTitle}`,
      head: branchName,
      base: 'main', // or whichever branch should be the base
      body: `This pull request resolves issue #${issueNumber} - ${issueTitle}.`
    });

    res.status(200).json({
      message: 'Pull request created successfully',
      pullRequestUrl: pullRequest.data.html_url
    });
  } catch (error) {
    console.error('Error resolving issue:', error);
    res.status(500).send('Failed to resolve the issue');
  }
});

// Placeholder function to simulate code generation
type GeneratedCode = string;
const generateCodeForIssue = (issueNumber: number): GeneratedCode => {
  // Implement logic to generate code based on the issue number
  // This is just a placeholder
  return `// Code for issue ${issueNumber}`;
};

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});