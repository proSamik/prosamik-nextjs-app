# GitHub README Blog Renderer

A Next.js application that renders GitHub README content in a Medium-style blog format. This project can fetch and display README files from GitHub repositories, handling various content types including text, images, and embedded videos.

## Features

- Renders markdown content in a clean, blog-style layout
- Supports various content types:
  - Headings
  - Paragraphs
  - Images (including SVGs)
  - YouTube video embeds
- Optimized image loading using Next.js Image component
- Responsive design
- TypeScript support
- Tailwind CSS styling

## Prerequisites

- Node.js 16.8 or later
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd [project-name]
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## Project Structure

```
src/
├── components/
│   └── Article.tsx
├── pages/
│   ├── _app.tsx
│   └── index.tsx
├── styles/
│   └── globals.css
└── types/
    └── article.ts
```

## Configuration

### Next.js Image Configuration

The project is configured to handle GitHub images. Check `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'github.com',
                pathname: '/**',
            }
        ],
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
};
```

### Tailwind Configuration

Tailwind is configured with typography and aspect-ratio plugins. Check `tailwind.config.ts`:

```typescript
export default {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/aspect-ratio'),
    ],
} satisfies Config;
```

## Data Structure

The application expects README content in the following format:

```typescript
interface ArticleData {
  metadata: {
    title: string;
    repo: string;
    lastUpdated: string;
  };
  content: {
    sections: Array<{
      type: string;
      level?: number;
      content?: string;
      alt?: string;
      url?: string;
      dimensions?: {
        width: number | null;
        height: number | null;
      } | null;
      platform?: string;
      embedUrl?: string;
    }>;
  };
}
```

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## Future Improvements

- Add database integration
- Implement admin dashboard for managing repos
- Add caching mechanism
- Implement error boundaries
- Add loading states
- Add image zoom functionality

