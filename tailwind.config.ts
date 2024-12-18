import type { Config } from "tailwindcss";
import typography from '@tailwindcss/typography';
import aspectRatio from '@tailwindcss/aspect-ratio';

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            h1: {
              marginBottom: '1rem',
            },
            h2: {
              marginTop: '2rem',
              marginBottom: '1rem',
            },
            p: {
              marginBottom: '1rem',
            },
            img: {
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
            }
          },
        },
      },
    },
  },
  plugins: [
    typography,
    aspectRatio,
  ],
} satisfies Config;