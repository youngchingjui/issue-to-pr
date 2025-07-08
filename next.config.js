const CSP_BASE_URL = "https://lavish-tugboat-5ca.notion.site/"
import MiniCssExtractPlugin from "mini-css-extract-plugin"

// Dynamically import the bundle analyzer for ESM
const withBundleAnalyzer = (await import("@next/bundle-analyzer")).default({
  enabled: process.env.ANALYZE === "true",
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/blogs",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-src 'self' ${CSP_BASE_URL};`,
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Add mini-css-extract-plugin
    config.plugins.push(
      new MiniCssExtractPlugin({
        filename: "static/css/[name].[contenthash:8].css",
        chunkFilename: "static/css/[name].[contenthash:8].chunk.css",
      })
    )

    // Add CSS loader configuration
    const rules = config.module.rules
      .find((rule) => typeof rule.oneOf === "object")
      .oneOf.filter((rule) => Array.isArray(rule.use))

    // Update CSS loaders to use MiniCssExtractPlugin
    rules.forEach((rule) => {
      rule.use.forEach((loader) => {
        if (
          loader.loader?.includes("css-loader") &&
          !loader.loader?.includes("postcss-loader")
        ) {
          const cssLoader = loader
          const loaders = rule.use
          const styleOrMiniCssIndex = loaders.findIndex(
            (loader) =>
              loader.loader?.includes("style-loader") ||
              loader.loader?.includes("mini-css-extract-plugin")
          )

          if (styleOrMiniCssIndex !== -1) {
            loaders[styleOrMiniCssIndex] = {
              loader: MiniCssExtractPlugin.loader,
            }
          }
        }
      })
    })

    // Avoid loading cpu-features to client side, from dockerode
    if (isServer) {
      config.externals.push("cpu-features")
    }

    return config
  },
}

// Export the config, wrapped with the analyzer if enabled
export default withBundleAnalyzer(nextConfig)
