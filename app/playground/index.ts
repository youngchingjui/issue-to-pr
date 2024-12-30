import express from 'express';
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';

const app = express();
app.use(express.json());

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const git = simpleGit();

app.post('/resolve', async (req, res) => {
  const { issueNumber, issueTitle } = req.body;
  const branchName = `${issueNumber}-${issueTitle.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;

  try {
    // Generate the code (placeholder for code generation logic)
    const generatedCode = "// Your generated code goes here\nconsole.log('Hello World!');";
    
    // Checkout to a new branch
    await git.checkoutLocalBranch(branchName);

    // Write code to the file (Assuming a main.ts file exists)
    const fs = require('fs');
    fs.writeFileSync('main.ts', generatedCode);

    // Commit the new changes
    await git.add('./*');
    await git.commit(`fix: Resolve issue #${issueNumber}`);

    // Push the new branch to remote
    await git.push('origin', branchName);

    // Create a pull request on GitHub
    const response = await octokit.pulls.create({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      title: `Resolve Issue #${issueNumber}: ${issueTitle}`,
      head: branchName,
      base: 'main', // Assuming 'main' is the default branch
      body: `This PR resolves the issue #${issueNumber} - ${issueTitle}`
    });

    res.status(200).json({
      message: 'Pull request created successfully',
      pullRequestUrl: response.data.html_url
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while resolving the issue.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
