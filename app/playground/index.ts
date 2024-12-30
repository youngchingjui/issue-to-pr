import express from 'express';
import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';

const router = express.Router();
const owner = 'your-github-username';
const repo = 'your-repo-name';
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Function to generate code - can be replaced with real code generation logic
function generateCodeForIssue(issueNumber: number): string {
    // Dummy code generation logic
    return `// Fix for issue #${issueNumber}`;
}

router.post('/resolve', async (req, res) => {
  const { issueNumber, issueTitle } = req.body;

  if (!issueNumber || !issueTitle) {
    return res.status(400).send('Issue number and issue title are required');
  }

  try {
    // Generate code
    const code = generateCodeForIssue(issueNumber);
    const branchName = `${issueNumber}-${issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    // Create new branch based on main
    execSync(`git checkout main`);
    execSync(`git pull origin main`);
    execSync(`git checkout -b ${branchName}`);

    // Write generated code to the file system - currently writing to a temp file
    const filePath = `./fixes/issue-${issueNumber}.ts`;
    require('fs').writeFileSync(filePath, code);
    
    // Commit changes
    execSync(`git add ${filePath}`);
    execSync(`git commit -m "Fix for issue #${issueNumber}"`);

    // Push changes to new branch
    execSync(`git push origin ${branchName}`);

    // Create pull request
    const prResponse = await octokit.pulls.create({
      owner,
      repo,
      title: `Fix for issue #${issueNumber}: ${issueTitle}`,
      head: branchName,
      base: 'main',
      body: `This addresses issue #${issueNumber}.` 
    });

    res.json({ message: 'Success', pullRequestUrl: prResponse.data.html_url });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while resolving the issue.');
  }
});

export default router;