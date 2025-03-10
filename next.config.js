const CSP_BASE_URL = "https://lavish-tugboat-5ca.notion.site/"

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
}

export default nextConfig
