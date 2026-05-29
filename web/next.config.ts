import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.1.10.207", "helpdesk.garkihospital.net.ng"],
  output: "standalone"
};

export default nextConfig;
