import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import typeScriptEslint from 'typescript-eslint';

export default defineConfig([
    eslint.configs.recommended,
    ...typeScriptEslint.configs.recommended,
    {
        files: ['**/*.{js,jsx,ts,tsx,mjs}'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            '@next/next': nextPlugin,
        },
        rules: {
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs['core-web-vitals'].rules,
        },
    },
    globalIgnores([
        '.next/**',
        '.vercel/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
]);
