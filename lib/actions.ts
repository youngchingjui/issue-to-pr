"use server"

async function fileExists(content: string): Promise<boolean> {
  // Placeholder function for checking if the file exists
  // This should be replaced by actual implementation
  return true;
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

  // Check if the file exists
  const doesExist = await fileExists(content);
  if (!doesExist) {
    return { error: "File does not exist" };
  }
  
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
