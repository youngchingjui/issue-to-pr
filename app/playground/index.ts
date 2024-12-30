import express from 'express';
import simpleGit from 'simple-git';
import GitHub from '@octokit/rest';

const router = express.Router();

// Initialize Git and GitHub client
const git = simpleGit();
const github = new GitHub({
  auth: process.env.GITHUB_TOKEN
});

// Endpoint to resolve issues
router.post('/resolve', async (req, res) => {
  const { issueNumber, issueTitle, codeGenerationFunction } = req.body;
  const branchName = `${issueNumber}-${issueTitle.replace(/\s+/g, '-').toLowerCase()}`;

  try {
    // Generate the code
    const generatedCode = codeGenerationFunction();

    // Create a new branch
    await git.checkoutLocalBranch(branchName);

    // Write the generated code to a file (assuming a specific file for simplicity)
    const filePath = 'path/to/generated/code.ts';
    require('fs').writeFileSync(filePath, generatedCode);

    // Add changes
    await git.add(filePath);

    // Commit changes
    await git.commit(`Resolve issue #${issueNumber}: ${issueTitle}`);

    // Push changes
    await git.push('origin', branchName);

    // Create a pull request
    const { data: pr } = await github.pulls.create({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      title: `Resolve Issue #${issueNumber}: ${issueTitle}`,
      head: branchName,
      base: 'main',
      body: `This resolves issue #${issueNumber}.`  // Adjust base branch as needed
    });

    // Respond with pull request URL
    res.status(200).json({ prUrl: pr.html_url });
  } catch (error) {
    console.error('Error resolving issue:', error);
    res.status(500).json({ error: 'Failed to resolve the issue' });
  }
});

export default router;