import express, { Request, Response } from 'express';
import { Octokit } from "@octokit/rest";
import { execSync } from 'child_process';

const app = express();
const port = process.env.PORT || 3000;
const githubToken = process.env.GITHUB_TOKEN;
const repositoryOwner = process.env.REPO_OWNER;
const repositoryName = process.env.REPO_NAME;

const octokit = new Octokit({
  auth: githubToken,
});

// Ensure all environment variables are set
if (!githubToken || !repositoryOwner || !repositoryName) {
  console.error("Missing environment variables.");
  process.exit(1);
}

app.post('/resolve', async (req: Request, res: Response) => {
  try {
    const { issueNumber, issueTitle, generatedCode } = req.body;

    if (!issueNumber || !issueTitle || !generatedCode) {
      return res.status(400).send("Missing parameters.");
    }

    const branchName = `issue-${issueNumber}-${issueTitle.replace(/\s+/g, '-').toLowerCase()}`;

    // Create a new branch from main
    execSync(`git checkout main`);
    execSync(`git pull`);
    execSync(`git checkout -b ${branchName}`);

    // Save generated code to the appropriate file(s)
    // This implementation depends on how you decide to structure files
    execSync(`echo '${generatedCode}' > app/playground/index.ts`);

    // Commit the changes to the new branch
    execSync(`git add .`);
    execSync(`git commit -m "Fix for issue #${issueNumber}: ${issueTitle}"`);

    // Push branch to remote
    execSync(`git push --set-upstream origin ${branchName}`);

    // Create a Pull Request
    const { data: pullRequest } = await octokit.pulls.create({
      owner: repositoryOwner,
      repo: repositoryName,
      title: `PR for issue #${issueNumber}: ${issueTitle}`,
      head: branchName,
      base: "main",
      body: `Fixes issue #${issueNumber}`
    });

    // Respond with the URL of the created pull request
    res.json({ pullRequestUrl: pullRequest.html_url });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error.");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
