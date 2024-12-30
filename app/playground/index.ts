import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);
const router = express.Router();

// Github personal access token needs to be set in environment variables
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Configuration for your repository
const OWNER = 'your-github-username';
const REPO = 'your-repository-name';

router.post('/resolve', async (req, res) => {
  const { issueNumber, issueTitle, codeToFix } = req.body;

  try {
    // Generate the branch name using GitHub's naming convention
    const branchName = `${issueNumber}-${issueTitle.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Create a new branch
    await execAsync(`git checkout -b ${branchName}`);
    
    // Add the generated code to the appropriate file
    // Temporary write to a file assuming the code is for a specific file
    // Use whatever logic necessary to handle where the code needs to be added
    const filePath = `src/${issueTitle.replace(/\s+/g, '-')}.ts`;
    await execAsync(`echo "${codeToFix}" > ${filePath}`);
    
    // Commit the changes
    await execAsync(`git add .`);
    await execAsync(`git commit -m 'fix: resolve #${issueNumber} ${issueTitle}'`);

    // Push the new branch to the remote repository
    await execAsync(`git push origin ${branchName}`);

    // Create a pull request
    await octokit.pulls.create({
      owner: OWNER,
      repo: REPO,
      title: `Fix issue #${issueNumber} - ${issueTitle}`,
      head: branchName,
      base: 'main', // Adjust base branch if needed
      body: `This resolves issue #${issueNumber} - ${issueTitle}.`,
    });

    res.status(200).json({ message: 'Pull request created successfully!' });
  } catch (error) {
    console.error('Error resolving issue:', error);
    res.status(500).json({ message: 'Failed to resolve issue.', error });
  }
});

export default router;
