import express from 'express';
import { exec } from 'child_process';
import { Octokit } from '@octokit/rest';
import { promisify } from 'util';

const app = express();
const execPromise = promisify(exec);

// Configuration (these values should be secured in environment variables in a real-world application)
const GITHUB_TOKEN = 'your_github_token'; // Replace with your GitHub token
const REPO_OWNER = 'your_repo_owner';     // Replace with your repository owner
const REPO_NAME = 'your_repo_name';       // Replace with your repository name

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

app.post('/resolve/:issueNumber', async (req, res) => {
  const issueNumber = req.params.issueNumber;

  try {
    // Fetch issue details from GitHub
    const { data: issue } = await octokit.issues.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: parseInt(issueNumber, 10),
    });

    const branchName = `${issueNumber}-${issue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    // Generate fix code - This is usually more complex and may include using AI/ML models
    const fixCode = `// This code was auto-generated to resolve issue ${issueNumber}`;
    // Assume the file needing the fix is `fix.ts`
    const filePath = 'fix.ts';

    // Create a new branch
    await execPromise(`git checkout -b ${branchName}`);

    // Write the generated code to the file (this is just an example, not a real code)
    await execPromise(`echo "${fixCode}" > ${filePath}`);

    // Commit the new code
    await execPromise(`git add ${filePath}`);
    await execPromise(`git commit -m "Fix issue #${issueNumber}: ${issue.title}"`);

    // Push the new branch to GitHub
    await execPromise(`git push origin ${branchName}`);

    // Create a pull request
    await octokit.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title: `Fix #${issueNumber}: ${issue.title}`,
      head: branchName,
      base: 'main', // Assuming 'main' is the default branch
      body: `This pull request addresses issue #${issueNumber}: ${issue.title}`,
    });

    res.status(200).send(`Pull request created for issue #${issueNumber}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while resolving the issue.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
