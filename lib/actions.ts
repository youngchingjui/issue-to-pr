"use server"

const processIssue = async (formData: FormData) => {
  try {
    const response = await fetch(`${process.env.BASE_URL}/api/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to process issue")
    }

    const data = await response.json()
    return data.code
  } catch (error) {
    console.error("Error processing issue:", error)
    return "Error processing issue. Please try again."
  }
}

export async function generateCode(formData: FormData) {
  const content = formData.get("content") as string
  const response = await fetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({ content }),
  })
  return response.json()
}

export async function commitChanges(formData: FormData) {
  const content = formData.get("content") as string
  const response = await fetch("/api/commit", {
    method: "POST",
    body: JSON.stringify({ content }),
  })
  return response.json()
}

export async function pushToGithub() {
  const response = await fetch("/api/push", {
    method: "POST",
  })
  return response.json()
}

export async function createPR() {
  const response = await fetch("/api/pr", {
    method: "POST",
  })
  return response.json()
}

export { processIssue }
