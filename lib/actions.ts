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

export { processIssue }
