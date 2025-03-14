import MiniCssExtractPlugin from "mini-css-extract-plugin"
const CSP_BASE_URL = "https://lavish-tugboat-5ca.notion.site/"

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Only run on client side
    if (!isServer) {
      config.plugins.push(
        new MiniCssExtractPlugin({
          filename: "[name].[contenthash].css",
          chunkFilename: "[id].[contenthash].css",
          ignoreOrder: true, // Disable CSS order warnings
        })
      )
    }
    return config
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
}

export default nextConfig
