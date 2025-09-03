import type { Config } from "tailwindcss"
import baseConfig from "../../tailwind.config"

// Extend the root Tailwind config so Storybook resolves theme (e.g., colors.border)
// and also scans Storybook files to generate the required utilities.
const config: Config = {
  ...(baseConfig as Config),
  content: [
    // Inherit any existing content globs from the base config
    ...(((baseConfig as unknown as Config).content as string[]) ?? []),

    // Storybook-specific globs
    "./src/**/*.{ts,tsx,mdx}",
    "./.storybook/**/*.{ts,tsx}",

    // Ensure monorepo sources used by stories are scanned
    "../../app/**/*.{ts,tsx}",
    "../../components/**/*.{ts,tsx}",
    "../../shared/src/**/*.{ts,tsx}",
  ],
}

export default config
