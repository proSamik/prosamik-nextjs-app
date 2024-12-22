import type { Config } from 'tailwindcss';

import typography from '@tailwindcss/typography';
import aspectRatio from '@tailwindcss/aspect-ratio';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.html',
  ],
  darkMode: 'class', // Enable dark mode using class
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            img: {
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
            },
            'h1, h2, h3, h4': {
              fontFamily: 'serif',
            },
          },
        },
      },
      colors: {
        // Optional: Define custom dark mode colors if needed
        dark: {
          background: '#121212',
          text: '#ffffff',
        },
      },
    },
  },
  plugins: [
    typography,
    aspectRatio,
  ],
} satisfies Config;