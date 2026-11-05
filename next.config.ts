import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Font tiếng Việt cho PDF được đọc từ ổ đĩa lúc chạy: phải đóng gói kèm khi deploy.
  outputFileTracingIncludes: {
    "/**": ["./src/assets/fonts/**"],
  },
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
