import express from 'express';
import { Octokit } from "@octokit/rest";
import simpleGit from 'simple-git';
import * as fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const git = simpleGit();

// Middleware to parse JSON
app.use(express.json());

// Endpoint to resolve issues
app.post('/resolve', async (req, res) => {
  const { issueNumber, issueTitle, userDetails } = req.body;
  if (!issueNumber || !issueTitle) {
    return res.status(400).json({ error: "Issue number and title are required" });
  }

  const branchName = `${issueNumber}-${issueTitle.replace(/\s+/g, '-').toLowerCase()}`;

  try {
    // Generate code snippet (Dummy code generation for this example)
    const generatedCode = `// This is the auto-generated code for Issue #${issueNumber}\nconst solution = () => { console.log('Issue resolved!'); };`;
    const filePath = path.resolve(__dirname, 'generatedCode.js');
    fs.writeFileSync(filePath, generatedCode);

    // Check the current branch and create a new branch
    await git.checkoutLocalBranch(branchName);

    // Add, Commit, and Push
    await git.add(filePath);
    await git.commit(`fix: resolve issue #${issueNumber}`);
    await git.push(['-u', 'origin', branchName]);

    // Create a pull request
    const prTitle = `Resolve issue #${issueNumber}: ${issueTitle}`;
    const prDescription = `This PR resolves the following issue: #${issueNumber}\n\nDetails: ${issueTitle}`;

    const { data: pullRequest } = await octokit.pulls.create({
      owner: userDetails.githubOwner,
      repo: userDetails.githubRepo,
      head: branchName,
      base: 'main',
      title: prTitle,
      body: prDescription,
    });

    res.json({
      success: true,
      pullRequest: pullRequest.html_url,
    });
  } catch (error) {
    console.error("Error resolving issue: ", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
