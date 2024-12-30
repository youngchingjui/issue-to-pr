import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import { Octokit } from "@octokit/core";

const app = express();
const REPO_OWNER = 'YOUR_GITHUB_USERNAME';
const REPO_NAME = 'YOUR_REPO_NAME';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

app.use(express.json());

const octokit = new Octokit({ auth: GITHUB_TOKEN });

app.post('/resolve', async (req: Request, res: Response) => {
  const { issueNumber, issueTitle, generatedCode } = req.body;

  try {
    // Generate branch name
    const branchName = `${issueNumber}-${issueTitle.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()}`;

    // Step 1 - Create new branch
    exec(`git checkout -b ${branchName}`, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: `Error creating branch: ${stderr}` });
      }
      console.log(`Branch created: ${branchName}`);

      // Step 2 - Write the generated code to the appropriate file
      // This example assumes the generated code should be placed in src/generatedCode.ts
      require('fs').writeFileSync('src/generatedCode.ts', generatedCode);

      // Step 3 - Commit changes
      exec('git add . && git commit -m "Fix issue via API"', (error, stdout, stderr) => {
        if (error) {
          return res.status(500).json({ error: `Error committing changes: ${stderr}` });
        }
        console.log(`Code committed.`);

        // Step 4 - Push new branch to GitHub
        exec(`git push origin ${branchName}`, (error, stdout, stderr) => {
          if (error) {
            return res.status(500).json({ error: `Error pushing to GitHub: ${stderr}` });
          }
          console.log(`Branch pushed: ${branchName}`);

          // Step 5 - Create a Pull Request
          octokit.request('POST /repos/{owner}/{repo}/pulls', {
            owner: REPO_OWNER,
            repo: REPO_NAME,
            head: branchName,
            base: 'main',
            title: `Resolved: ${issueTitle}`,
            body: `This pull request addresses issue #${issueNumber}`
          }).then(response => {
            res.status(200).json({ message: 'Pull request created', url: response.data.html_url });
          }).catch((prError) => {
            res.status(500).json({ error: `Error creating pull request: ${prError.message}` });
          });

        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: `An unexpected error occurred: ${error.message}` });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));