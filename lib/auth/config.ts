// TODO: Review if we still need this after we migrate away from OAuth app

export const AUTH_CONFIG = {
  // Change this to switch between OAuth and GitHub App
  defaultProvider: "github-app" as const,

  // Helper to get the current provider ID
  getCurrentProvider: () => {
    return process.env.USE_GITHUB_APP === "true" ? "github-app" : "github-oauth"
  },

  // Helper to check if using OAuth
  isUsingOAuth: () => {
    return AUTH_CONFIG.getCurrentProvider() === "github-oauth"
  },

  // How long we keep the cached auth token in Redis when the provider
  // does not supply an explicit expires_in value (seconds)
  tokenCacheTtlSeconds: 60 * 60 * 24 * 7, // 7 days

  // How long the NextAuth session should remain valid (seconds)
  sessionMaxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
}

