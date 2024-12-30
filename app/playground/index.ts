import express from 'express';
import { exec } from 'child_process';
import * as fs from 'fs';
import { Octokit } from "@octokit/rest";

const app = express();
const port = process.env.PORT || 3000;

// Initialize Octokit with a personal access token
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

app.use(express.json());

// Route to handle resolution of an issue
app.post('/resolve', async (req, res) => {
  try {
    const { issueNumber, issueTitle, owner, repo } = req.body;

    if (!issueNumber || !issueTitle || !owner || !repo) {
      return res.status(400).send({ message: 'Missing required fields'});
    }

    // Step 1: Generate the code (This can be a complex operation; for simplicity, we'll assume code is generated)
    const generatedCode = "// Example generated code\nconsole.log('Hello, World!');";
    const filePath = `./generated/fix-${issueNumber}.js`;
    fs.writeFileSync(filePath, generatedCode);

    // Step 2: Create a new branch
    const branchName = `issue-${issueNumber}-${issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await execShellCommand(`git checkout -b ${branchName}`);

    // Step 3: Commit the generated code to the new branch
    fs.writeFileSync(filePath, generatedCode);
    await execShellCommand(`git add ${filePath}`);
    await execShellCommand(`git commit -m "Resolve issue #${issueNumber}: ${issueTitle}"`);

    // Step 4: Push the changes to GitHub
    await execShellCommand(`git push origin ${branchName}`);

    // Step 5: Create a pull request
    const pullRequest = await octokit.pulls.create({
      owner,
      repo,
      title: `Fix for issue #${issueNumber}: ${issueTitle}`,
      head: branchName,
      base: 'main', // Assuming 'main' is the default branch
      body: `This PR addresses: #${issueNumber}`
    });

    // Return success response
    res.status(200).send({
      message: 'Pull request created successfully',
      pullRequestUrl: pullRequest.data.html_url
    });

  } catch (error) {
    console.error('Error resolving issue:', error);
    res.status(500).send({ message: 'Failed to resolve issue', error: error.message });
  }
});

// Helper function to execute shell commands
function execShellCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(error);
        reject(stderr);
      }
      resolve(stdout);
    });
  });
}

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
