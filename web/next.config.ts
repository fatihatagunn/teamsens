import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// In production:  Next.js is compiled to a static export (`out/`) and the Go
//                 binary serves both the static files and the API from a single
//                 container — rewrites are not needed (and incompatible with
//                 `output: 'export'`).
//
// In development: `output: 'export'` is disabled so that Next.js dev server
//                 runs normally. Rewrites proxy /api/* to the Go backend.
//                 The destination is controlled by BACKEND_URL so it works
//                 both locally (`http://localhost:8080`) and inside Docker
//                 Compose (`http://api:8080`).

const nextConfig: NextConfig = {
  ...(isProd && { output: "export" }),

  images: {
    unoptimized: true,
  },

  ...(!isProd && {
    async rewrites() {
      const backendURL = process.env.BACKEND_URL ?? "http://localhost:8080";
      return [
        {
          source: "/api/:path*",
          destination: `${backendURL}/api/:path*`,
        },
      ];
    },
  }),
};

export default nextConfig;
