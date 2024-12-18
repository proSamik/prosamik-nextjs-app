import type { Config } from 'tailwindcss';

import typography from '@tailwindcss/typography';
import aspectRatio from '@tailwindcss/aspect-ratio';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.html',  // Add this line to ensure HTML files are included for Tailwind CSS processing.
  ],
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
    },
  },
  plugins: [
    typography,
    aspectRatio,
  ],
} satisfies Config;
