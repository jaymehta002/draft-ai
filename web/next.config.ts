import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['overuse-fetal-esophagus.ngrok-free.dev']
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
