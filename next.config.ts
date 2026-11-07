import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// Lets `npm run dev` use Cloudflare features (like the database) on your computer.
initOpenNextCloudflareForDev();
