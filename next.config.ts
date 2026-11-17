import type { NextConfig } from "next";
import { withDualmark } from "@dualmark/nextjs";

const nextConfig: NextConfig = {
    outputFileTracingRoot: process.cwd(),
    // Blog posts are read from content/blogs at build and request time; make sure they ship with the server bundle.
    outputFileTracingIncludes: {
        '/blogs/[slug]': ['./content/blogs/**/*'],
        '/md/[...path]': ['./content/blogs/**/*'],
        '/llms.txt': ['./content/blogs/**/*'],
        '/sitemap.xml': ['./content/blogs/**/*'],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.prosamik.com',
                pathname: '/portfolio/**',
            },
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
    reactStrictMode: false,
    productionBrowserSourceMaps: true,
};

export default withDualmark(nextConfig, { siteUrl: 'https://www.prosamik.com' });
