import { fileExists } from "./fs";

"use server"

export async function generateCode(formData: FormData) {
  const content = formData.get("content") as string
  const response = await fetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({ content }),
  })
  return response.json()
}

export async function commitChanges(formData: FormData) {
  const content = formData.get("content") as string;
  const files = JSON.parse(content) as string[];

  const validFiles = files.filter((file) => {
    if (fileExists(file)) {
      return true;
    } else {
      console.error(`File not found: ${file}`);
      return false;
    }
  });

  // Assuming the commit API endpoint expects a list of valid files
  const response = await fetch("/api/commit", {
    method: "POST",
    body: JSON.stringify({ files: validFiles }),
  });

  return response.json();
}

export async function pushToGithub() {
  const response = await fetch("/api/push", {
    method: "POST",
  })
  return response.json()
}

export async function createPR() {
  const response = await fetch("/api/pr", {
    method: "POST",  })
  return response.json()
}
