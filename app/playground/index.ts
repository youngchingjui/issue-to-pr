import { NextApiRequest, NextApiResponse } from 'next';
import { Octokit } from "@octokit/rest";
import { execSync } from 'child_process';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { issueNumber, issueTitle, generatedCode } = req.body;

    if (!issueNumber || !issueTitle || !generatedCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const branchName = `${issueNumber}-${issueTitle.replace(/\s+/g, '-').toLowerCase()}`;

    // Create a new branch and switch to it
    execSync(`git checkout -b ${branchName}`);

    // Generate code in the desired location in the repository
    // Assuming generatedCode is a string containing the new file content
    const pathToNewFile = 'path/to/generated/file.ts';
    require('fs').writeFileSync(pathToNewFile, generatedCode);

    // Commit the changes
    execSync('git add .');
    execSync(`git commit -m "Fixes #${issueNumber} - ${issueTitle}"`);

    // Push the new branch to remote
    execSync(`git push origin ${branchName}`);

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    // Create a pull request
    const prResponse = await octokit.pulls.create({
      owner,
      repo,
      title: `Fixes #${issueNumber} - ${issueTitle}`,
      head: branchName,
      base: 'main', // Assume main is the default branch
      body: `This PR resolves issue #${issueNumber} by implementing the requested features.`,
    });

    res.status(200).json({ pullRequestUrl: prResponse.data.html_url });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
