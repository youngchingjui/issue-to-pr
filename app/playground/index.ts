import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import { Octokit } from '@octokit/rest';

const app = express();
const port = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'your-github-username';  // Update with your GitHub username
const REPO_NAME = 'your-repo-name';  // Update with your repository name

// Initialize Octokit for GitHub API
const octokit = new Octokit({ auth: GITHUB_TOKEN });

app.use(express.json());

// The /resolve endpoint
app.post('/resolve', async (req: Request, res: Response) => {
    const { issueNumber, codeToCommit } = req.body;

    if (!issueNumber || !codeToCommit) {
        return res.status(400).send({ message: 'Issue number and code to commit are required.' });
    }

    const branchName = `issue-${issueNumber}`;
    const commitMessage = `Resolve issue #${issueNumber}`;

    try {
        // Step 1: Generate code
        // Simulating code generation as codeToCommit is received directly

        // Step 2: Create a new branch tied to the issue number
        await execPromise(`git checkout -b ${branchName}`);

        // Step 3: Commit the generated code
        await execPromise(`echo "${codeToCommit}" > auto_generated_file.ts`);
        await execPromise(`git add auto_generated_file.ts`);
        await execPromise(`git commit -m "${commitMessage}"`);

        // Step 4: Push the branch to GitHub
        await execPromise(`git push origin ${branchName}`);

        // Step 5: Create a pull request on GitHub
        await octokit.pulls.create({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            title: `Resolve issue #${issueNumber}`,
            head: branchName,
            base: 'main',
            body: `This pull request resolves issue #${issueNumber}.`,
        });

        res.status(200).send({ message: 'Pull request created successfully.' });
    } catch (error) {
        console.error('Error resolving issue:', error);
        res.status(500).send({ message: 'Failed to resolve issue and create pull request.' });
    }
});

// Utility to perform shell commands in a promise-based pattern
function execPromise(command: string) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Exec error: ${stderr}`);
                return;
            }
            resolve(stdout);
        });
    });
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
