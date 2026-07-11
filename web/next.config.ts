import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    // Prevent Next.js from picking the repo-root lockfile over web/package-lock.json
    root: process.cwd(),
  },
  allowedDevOrigins: ['overuse-fetal-esophagus.ngrok-free.dev']
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
