import type { StorybookConfig } from "@storybook/nextjs-vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const config: StorybookConfig = {
  stories: [
    "../src/stories/**/*.mdx",
    "../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: [
    { from: "../src/stories/assets", to: "/stories/assets" },
    "../../../public",
  ],
  viteFinal: async (config) => {
    const rootDir = fileURLToPath(new URL("../../../", import.meta.url))
    config.resolve = config.resolve || {}

    // Filter out any existing @ aliases and add our own at the beginning
    const existingAliases = Array.isArray(config.resolve.alias)
      ? config.resolve.alias.filter(
          (a) =>
            !(
              (typeof a.find === "string" && a.find.startsWith("@")) ||
              (a.find instanceof RegExp && a.find.source.includes("@"))
            )
        )
      : Object.entries(config.resolve.alias || {})
          .filter(([find]) => !find.startsWith("@"))
          .map(([find, replacement]) => ({ find, replacement }))

    config.resolve.alias = [
      { find: /^@\/shared/, replacement: path.resolve(rootDir, "shared/src") },
      { find: /^shared/, replacement: path.resolve(rootDir, "shared/src") },
      { find: /^@\//, replacement: `${rootDir}/` },
      ...existingAliases,
    ]
    return config
  },
}
export default config
