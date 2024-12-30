import express from 'express';
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import generateCode from './codeGenerator'; // hypothetical code generator function

const app = express();
const port = process.env.PORT || 3000;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'your-repo-owner';  // replace with actual repo owner
const REPO_NAME = 'your-repo-name';    // replace with actual repo name

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const git = simpleGit();

app.use(express.json());

app.post('/resolve', async (req, res) => {
    try {
        const { issueNumber, issueTitle } = req.body;
        if (!issueNumber || !issueTitle) {
            return res.status(400).send('Issue number and title are required.');
        }
        
        // Step 1: Generate the code
        const generatedCode = generateCode(issueTitle); // hypothetical function that returns code as a string

        // Step 2: Create a new branch
        const branchName = `issue-${issueNumber}-${issueTitle.toLowerCase().replace(/\s+/g, '-')}`;
        await git.checkoutLocalBranch(branchName);

        // Step 3: Save generated code to a file or make modifications as needed
        // (Assuming the code should be written to a file called 'solution.ts')
        await git.add('.');
        await git.commit('Generated solution for issue #' + issueNumber);

        // Step 4: Push branch to GitHub
        await git.push('origin', branchName);

        // Step 5: Create a pull request on GitHub
        const pullRequest = await octokit.pulls.create({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            title: `Fix for issue #${issueNumber}: ${issueTitle}`,
            head: branchName,
            base: 'main', // assuming main is the default branch
            body: 'This pull request contains the generated code to resolve the issue.',
        });

        res.json({
            message: 'Pull request created successfully.',
            pullRequestUrl: pullRequest.data.html_url,
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while processing the request.');
    }
});

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});

export default app;