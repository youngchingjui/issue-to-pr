import express from 'express';
import { exec } from 'child_process';
import { Octokit } from '@octokit/rest';

const app = express();
app.use(express.json());

const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

const octokit = new Octokit({ auth: GITHUB_ACCESS_TOKEN });

app.post('/resolve', async (req, res) => {
    const { issueNumber, issueTitle } = req.body;

    if (!issueNumber || !issueTitle) {
        return res.status(400).json({ message: 'issueNumber and issueTitle are required' });
    }

    try {
        // Generate the branch name
        const branchName = `${issueNumber}-${issueTitle.replace(/\s+/g, '-').toLowerCase()}`;

        // Step 1: Generate the code (Imagine this is done by a function `generateCode`)
        console.log(`Generating code for issue #${issueNumber}`);
        await generateCode();

        // Step 2: Create a new branch and check it out
        exec(`git checkout -b ${branchName}`, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Failed to create a new branch', error: err });
            }

            // Step 3: Commit the changes
            exec('git add . && git commit -m "fix: Implemented solution for issue #' + issueNumber + '"', (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to commit changes', error: err });
                }

                // Step 4: Push the new branch to Github
                exec(`git push origin ${branchName}`, async (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to push branch', error: err });
                    }

                    // Step 5: Create a pull request
                    try {
                        const pullRequest = await octokit.pulls.create({
                            owner: REPO_OWNER,
                            repo: REPO_NAME,
                            title: `Fix for issue #${issueNumber}: ${issueTitle}`,
                            head: branchName,
                            base: 'main',
                            body: 'This PR addresses issue #' + issueNumber
                        });

                        return res.status(200).json({ message: 'Pull request created', pull_request_url: pullRequest.data.html_url });
                    } catch (error) {
                        return res.status(500).json({ message: 'Failed to create pull request', error: error });
                    }
                });
            });
        });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error', error: error });
    }
});

function generateCode() {
    // Placeholder implementation
    return new Promise<void>((resolve) => {
        console.log('Code generation completed.');
        resolve();
    });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
