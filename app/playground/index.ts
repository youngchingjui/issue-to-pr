import express from 'express';
import { Octokit } from "@octokit/rest";
import simpleGit from 'simple-git';
import generateCode from './generateCode';
import { resolveIssueBranchName } from './utils';

const app = express();
const port = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const git = simpleGit();

app.post('/resolve', async (req, res) => {
    try {
        const { issueNumber, issueTitle } = req.body;
        if (!issueNumber || !issueTitle) {
            return res.status(400).send('Issue number and title are required');
        }

        // Generate code
        const generatedCode = generateCode(issueTitle);

        // Checkout to a new branch
        const branchName = resolveIssueBranchName(issueNumber, issueTitle);
        await git.checkoutLocalBranch(branchName);

        // Save generated code to a file or apply changes.
        // This step will depend on your specific application structure.
        // For example:
        // await fs.writeFileSync('./path/to/file.ts', generatedCode);

        // Commit changes
        await git.add('./*');
        await git.commit(`Resolve issue #${issueNumber}: ${issueTitle}`);

        // Push changes
        await git.push('origin', branchName);

        // Create a pull request
        const pullRequest = await octokit.pulls.create({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            title: `Fix #${issueNumber}: ${issueTitle}`,
            head: branchName,
            base: 'main', // Change base branch as needed
        });

        return res.status(200).json({ message: 'Pull request created', url: pullRequest.data.html_url });
    } catch (error) {
        console.error(`Error resolving issue: ${error}`);
        return res.status(500).send('An error occurred while processing the request.');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// utils.ts
export const resolveIssueBranchName = (issueNumber: string, issueTitle: string): string => {
    // Use Github's branch auto-naming convention
    const safeTitle = issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${issueNumber}-${safeTitle}`;
};

// generateCode.ts
const generateCode = (issueTitle: string): string => {
    // Pseudocode for generating applicable code based on the issue title
    // Needs to be replaced with the actual implementation
    return `// Code generated for: ${issueTitle}`;
};
