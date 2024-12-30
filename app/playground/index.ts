import express from 'express';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const router = express.Router();

// Helper function to run shell commands
const runCommand = (command: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
};

router.post('/resolve', async (req, res) => {
    try {
        const { issueNumber, issueTitle, userRepo, githubToken } = req.body;
        if (!issueNumber || !issueTitle || !userRepo || !githubToken) {
            return res.status(400).json({ error: 'Missing required parameters.' });
        }

        // Generate the code (simulate code generation)
        const generatedCode = `// Sample code for issue #${issueNumber}`;// Placeholder comment
        const filePath = path.join(__dirname, 'generatedCode.ts');
        await fs.writeFile(filePath, generatedCode);

        // Create and switch to a new branch
        const branchName = `${issueNumber}-${issueTitle.replace(/ /g, '-')}`;
        await runCommand(`git checkout -b ${branchName}`);

        // Commit changes
        await runCommand('git add .');
        await runCommand(`git commit -m "Resolve issue #${issueNumber}"`);

        // Push changes
        await runCommand(`git push origin ${branchName}`);

        // Create a pull request using GitHub REST API
        const prResponse = await fetch(`https://api.github.com/repos/${userRepo}/pulls`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: `Resolve issue #${issueNumber}: ${issueTitle}`,
                head: branchName,
                base: 'main', // Adjust if your default branch is different
                body: `This PR addresses issue #${issueNumber}.`,
            })
        });

        const prData = await prResponse.json();
        if (!prResponse.ok) {
            throw new Error(`Error creating PR: ${prData.message}`);
        }

        res.status(200).json({ message: 'Pull request created successfully.', prUrl: prData.html_url });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while resolving the issue: ' + error.message });
    }
});

export default router;