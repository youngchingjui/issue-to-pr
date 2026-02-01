export const AUTH_CONFIG = {
  // Provider ID used for sign-in
  defaultProvider: "github-app" as const,

  // How long the NextAuth session should remain valid (seconds)
  sessionMaxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
}
