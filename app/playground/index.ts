import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { Octokit } from '@octokit/rest';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const port = process.env.PORT || 3000;
const repoOwner = 'your-github-username';
const repoName = 'your-repo-name';
const githubToken = 'your-github-token';

app.use(express.json());

// Initialize Octokit
const octokit = new Octokit({
  auth: githubToken
});

// Function to generate code (dummy function in this case)
const generateCode = (issueTitle: string): string => {
  return `// Code generated for issue: ${issueTitle}\nconsole.log('Fix for ${issueTitle}');\n`;
};

app.post('/resolve', async (req, res) => {
  const { issueNumber, issueTitle } = req.body;

  if (!issueNumber || !issueTitle) {
    return res.status(400).send('Issue number and title are required');
  }

  const branchName = `${issueNumber}-${issueTitle.replace(/\s+/g, '-').toLowerCase()}`;
  const filePath = path.join(__dirname, `fix-${issueNumber}.ts`);

  try {
    // Step 1: Generate the code
    const code = generateCode(issueTitle);

    // Write code to file
    await execAsync(`echo "${code}" > ${filePath}`);

    // Step 2: Create a new branch
    await execAsync(`git checkout -b ${branchName}`);

    // Step 3: Add and commit changes
    await execAsync(`git add ${filePath}`);
    await execAsync(`git commit -m "fix: ${issueTitle}"`);

    // Step 4: Push the branch
    await execAsync(`git push origin ${branchName}`);

    // Step 5: Create a pull request on GitHub
    const { data: pullRequest } = await octokit.pulls.create({
      owner: repoOwner,
      repo: repoName,
      title: `Fix: ${issueTitle}`,
      head: branchName,
      base: 'main', // Assuming main is the default branch
      body: `This pull request addresses issue #${issueNumber}`
    });

    return res.status(200).send({
      message: 'Pull request successfully created',
      pullRequest
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('An error occurred while creating the pull request');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

export default app;