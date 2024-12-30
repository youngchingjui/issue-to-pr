import express from 'express';
import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;

// You'll need a GitHub token with repo scope
const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  throw new Error('GitHub token is required');
}

const octokit = new Octokit({ auth: githubToken });
const repoOwner = 'your-github-username'; // Replace with your GitHub username or organization
const repoName = 'your-repo-name'; // Replace with the repository name

app.post('/resolve', async (req, res) => {
  try {
    const issueNumber = req.body.issueNumber;
    const issueTitle = req.body.issueTitle;
    if (!issueNumber || !issueTitle) {
      return res.status(400).send('Issue number and title are required');
    }

    const branchName = `${issueNumber}-${issueTitle.toLowerCase().replace(/ /g, '-')}`;

    // Clone the repo (assumes you have SSH access or set up a deploy key)
    execSync(`git clone git@github.com:${repoOwner}/${repoName}.git`);

    const repoPath = path.join(process.cwd(), repoName);
    process.chdir(repoPath);

    // Create and checkout the new branch
    execSync(`git checkout -b ${branchName}`);

    // Placeholder for code generation function
    generateCode();

    // Commit and push changes
    execSync('git add .');
    execSync(`git commit -m "Fixes #${issueNumber} - ${issueTitle}"`);
    execSync(`git push origin ${branchName}`);

    // Create a pull request on GitHub
    const { data: pullRequest } = await octokit.pulls.create({
      owner: repoOwner,
      repo: repoName,
      title: `Fix #${issueNumber}: ${issueTitle}`,
      head: branchName,
      base: 'main', // Or your default branch
      body: `Pull request to fix issue #${issueNumber} titled "${issueTitle}".`
    });

    res.send({
      message: 'Pull request created successfully',
      pullRequestUrl: pullRequest.html_url
    });
  } catch (error) {
    console.error('Failed to resolve issue:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    // Clean up - remove the cloned repo directory
    execSync(`rm -rf ${repoName}`);
  }
});

const generateCode = () => {
  // Implement a function here that generates the code fix
  fs.writeFileSync('generated-code.txt', 'This is where the generated code would go');
};

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
