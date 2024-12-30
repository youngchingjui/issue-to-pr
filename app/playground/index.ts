import express from 'express';
import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

app.post('/resolve', async (req, res) => {
    const { issueNumber, issueTitle, repoOwner, repoName } = req.body;

    if (!issueNumber || !issueTitle || !repoOwner || !repoName) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        // Initialize Octokit
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        // Define branch name following GitHub's auto-naming convention
        const branchName = `${issueNumber}-${issueTitle.replace(/\s+/g, '-').toLowerCase()}`;

        // Generate code (Placeholder: implement your own code generation logic here)
        const generatedCode = 'console.log("Hello World!");';
        const generatedFilePath = path.join(__dirname, 'generatedCode.js');
        fs.writeFileSync(generatedFilePath, generatedCode);

        // Create a new branch related to the issue number
        execSync(`git checkout -b ${branchName}`);
        
        // Add, commit and push the generated code
        execSync(`git add ${generatedFilePath}`);
        execSync(`git commit -m "Fix for issue #${issueNumber}"`);
        execSync(`git push origin ${branchName}`);

        // Create a pull request
        await octokit.pulls.create({
            owner: repoOwner,
            repo: repoName,
            title: `Fix: ${issueTitle}`,
            head: branchName,
            base: 'main', // Change base as required
            body: `This pull request resolves issue #${issueNumber}`
        });

        res.status(200).json({ message: 'Pull request successfully created' });
    } catch (error) {
        console.error('Error resolving issue:', error);
        res.status(500).json({ error: 'An error occurred while resolving the issue' });
    }
});

// Start the app
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
