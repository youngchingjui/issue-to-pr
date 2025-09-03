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
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": rootDir,
    }
    return config
  },
}
export default config
