const CSP_BASE_URL = "https://lavish-tugboat-5ca.notion.site/"
import MiniCssExtractPlugin from "mini-css-extract-plugin"

/** @type {import('next').NextConfig} */
const nextConfig = {
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

    return config
  },
}

export default nextConfig
