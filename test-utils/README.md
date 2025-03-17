# Testing Infrastructure

This directory contains utilities and documentation for testing workflows in the application.

## Mock Services

### Configuration

The testing infrastructure can be controlled via environment variables:

```bash
USE_MOCK_LLM=true    # Use mock LLM instead of real OpenAI API
USE_MOCK_GITHUB=true # Use mock GitHub client instead of real GitHub API
```

### MockLLM

The `MockLLM` class provides a way to test LLM interactions without making real API calls to OpenAI. It supports both streaming and non-streaming responses.

```typescript
import { MockLLM, MockResponse } from "@/lib/mocks/MockLLM"

// Create a mock LLM
const llm = new MockLLM()

// Set up a mock response for specific messages
const messages = [{ role: "user", content: "Hello" }]
const mockResponse: MockResponse = {
  choices: [
    {
      message: {
        content: "Hello! How can I help you?",
        role: "assistant",
      },
    },
  ],
}
llm.setResponse(messages, mockResponse)

// Use the mock LLM
const response = await llm.chat.completions.create({
  messages,
  model: "gpt-4",
  stream: false,
})
```

### MockGithubClient

The `MockGithubClient` class provides a way to test GitHub API interactions without making real API calls.

```typescript
import { MockGithubClient } from "@/lib/mocks/MockGithubClient"

// Create a mock GitHub client
const github = new MockGithubClient()

// Set up a mock response for a specific operation
github.setMockResponse("createIssue", {
  number: 123,
  html_url: "https://github.com/org/repo/issues/123",
})

// Use the mock GitHub client
const response = await github.createIssue({
  owner: "org",
  repo: "repo",
  title: "Test Issue",
})

// Verify operations
const operations = github.getOperations()
console.log(operations) // List of all operations performed
```

## Writing Tests

When writing tests for workflows:

1. Use environment variables to enable mocks
2. Set up mock responses for expected API calls
3. Run your workflow
4. Verify the operations performed using the mock clients' utility methods

Example:

```typescript
describe("Issue to PR Workflow", () => {
  let mockLLM: MockLLM
  let mockGithub: MockGithubClient

  beforeEach(() => {
    // Set up mocks
    mockLLM = new MockLLM()
    mockGithub = new MockGithubClient()

    // Set up mock responses
    mockLLM.setResponse([{ role: "user", content: "Create PR" }], {
      choices: [
        {
          message: {
            content: "Creating PR...",
            role: "assistant",
          },
        },
      ],
    })
  })

  it("should create a PR from an issue", async () => {
    const workflow = new Workflow({
      llm: mockLLM,
      githubClient: mockGithub,
    })

    await workflow.run()

    // Verify GitHub operations
    const operations = mockGithub.getOperations()
    expect(operations).toContainEqual({
      type: "createPullRequest",
      params: expect.any(Object),
    })
  })
})
```

## Best Practices

1. Always clear mock responses and operations between tests
2. Set up specific mock responses for each test case
3. Use TypeScript types for type safety
4. Verify both successful and error scenarios
5. Test streaming responses when applicable
