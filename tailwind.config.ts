import type { Config } from 'tailwindcss';

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
      transitionDuration: {
        '3000': '3000ms',
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
  plugins: [],
} satisfies Config;
