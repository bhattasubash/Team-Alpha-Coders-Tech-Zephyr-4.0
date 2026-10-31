/** @type {import('next').NextConfig} */
const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig = {
  outputFileTracing: false,
  // Proxy API calls to the FastAPI backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
