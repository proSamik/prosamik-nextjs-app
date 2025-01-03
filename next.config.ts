import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'github.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'github-readme-stats.vercel.app',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'git-hub-streak-stats.vercel.app',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'raw.githubusercontent.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'img.shields.io',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'komarev.com',
                pathname: '/**',
            }
        ],
        dangerouslyAllowSVG: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    experimental: {
        isrFlushToDisk: false, // Disable ISR flushing during development
    },
    devIndicators: {
        buildActivity: false,  // Disables the build activity indicator
        appIsrStatus: false,  // Disables ISR status
    },
    reactStrictMode: false,
    productionBrowserSourceMaps: true,
};

export default nextConfig;
