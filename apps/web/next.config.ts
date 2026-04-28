import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ['@nutrigoal/shared'],
};

export default withSentryConfig(nextConfig, {
  org: "meal-and-motion",
  project: "meal-and-motion-web",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
