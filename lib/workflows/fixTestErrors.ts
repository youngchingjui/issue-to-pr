import { setupLocalRepository } from "@/lib/utils/utils-server"
import { exec } from "child_process"
import util from "util"

const execPromise = util.promisify(exec)

export interface FixTestErrorsParams {
  repoFullName: string
  pullNumber: number
  baseDir?: string
  apiKey: string
  jobId?: string
  runTestsFn?: (params: { baseDir: string }) => Promise<string>
  llmAgent?: (params: { testOutput: string; apiKey: string }) => Promise<string>
}

export async function fixTestErrors({
  repoFullName,
  pullNumber,
  baseDir,
  apiKey,
  runTestsFn,
  llmAgent,
  jobId,
}: FixTestErrorsParams): Promise<string> {
  // Step 1: Setup repo and checkout PR branch (assume branch "pr-<number>" for now)
  const branchName = `pr-${pullNumber}`
  const dir = baseDir || (await setupLocalRepository({ repoFullName, workingBranch: branchName }))

  // Step 2: Run tests
  let testOutput: string
  if (runTestsFn) {
    testOutput = await runTestsFn({ baseDir: dir })
  } else {
    // Default: run "npm test" in repo
    try {
      const { stdout, stderr } = await execPromise('npm test', { cwd: dir })
      testOutput = stdout + "\n" + stderr
    } catch (err: any) {
      testOutput = (err.stdout || "") + "\n" + (err.stderr || "") + "\n" + (err.message || String(err))
    }
  }

  // Step 3: Call LLM agent for suggestion
  let suggestion: string
  if (llmAgent) {
    suggestion = await llmAgent({ testOutput, apiKey })
  } else {
    // Default: simple OpenAI chat completion
    const OpenAI = (await import("openai")).default
    const openai = new OpenAI({ apiKey })

    const userMsg = `Here are the results of running 'npm test' on the PR branch:\n\n${testOutput}\n\nPlease suggest fixes for the failed tests.`
    const chatResp = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an expert developer helping to fix JavaScript/TypeScript tests." },
        { role: "user", content: userMsg },
      ],
    })
    suggestion = chatResp.choices[0].message.content || ""
  }

  // Step 4: Log suggestions
  console.log("LLM Suggestions:", suggestion)

  // Step 5: Return suggestions (can include more meta in future)
  return suggestion
}
