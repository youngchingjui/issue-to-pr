import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { content } = await request.json()

  // Simple processing: Extract title, body, and add some mock code
  const lines = content.split("\n")
  const title = lines[0]
  const body = lines.slice(1).join("\n")

  // Generate some mock code based on the issue content
  const mockCode = `
// Issue Title: ${title}
// Issue Body Length: ${body.length} characters

function processIssue(title, body) {
  console.log('Processing issue:', title);
  // Add your issue processing logic here
  return {
    title,
    bodyLength: body.length,
    status: 'processed'
  };
}

const result = processIssue("${title.replace(/"/g, '\\"')}", "...");
console.log(result);
`

  return NextResponse.json({ code: mockCode })
}
