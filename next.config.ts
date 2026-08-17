import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  async redirects() {
    return [
      {
        source: "/assessment",
        destination: "/dashboard/penilaian",
        permanent: false,
      },
      {
        source: "/assessment/:periodeId",
        destination: "/dashboard/penilaian/:periodeId",
        permanent: false,
      },
      {
        source: "/self-assessment",
        destination: "/dashboard/penilaian",
        permanent: false,
      },
      {
        source: "/self-assessment/:periodeId",
        destination: "/dashboard/penilaian/:periodeId",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
