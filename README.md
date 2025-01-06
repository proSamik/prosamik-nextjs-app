# ProSamik Next.js Application

It is currently markdown renderer turned portfolio website. Initially, the goal was to create a blogs website which uses markdown then it converted into portfolio website to test its feasibility, and later on it will be implemented for general purpose blog website with a single source of truth that is GitHub Markdown file.

To understand the project in-depth [click here](https://prosamik.com/projects/prosamik-nextjs-app)

## Prerequisites

Before you begin, ensure you have installed:
- Node.js (LTS version recommended)
- npm (comes with Node.js)
- Git

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/proSamik/prosamik-nextjs-app.git
   cd prosamik-nextjs-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   PORT=10000 # Or your preferred backend port
   NEXT_PUBLIC_BASE_URL=http://your-backend-url:10000
   ```

## Development

To run the development server with Turbopack:

```bash
npm run dev
```

The application will be available at `http://localhost:3000` (or your configured port).

## Building for Production

1. Generate sitemap and build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Generate sitemap and build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality
- `npm run generate-sitemap` - Generate sitemap manually

## Dependencies

### Core Dependencies
- Next.js 15.1.2
- React 19.0.0
- TypeScript
- Tailwind CSS 3.4.1

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Add me as a reviewer 
6. Submit a pull request


## Troubleshooting

Common issues and solutions:

1. Build errors
  - Clear `.next` directory: `rm -rf .next`
  - Delete `node_modules`: `rm -rf node_modules`
  - Reinstall dependencies: `npm install`

2. Environment variables not working
  - Ensure `.env` file is in the root directory
  - Verify all environment variables start with `NEXT_PUBLIC_` if used in client-side code
  - Restart the development server

3. Turbopack issues
  - Try running without Turbopack: Remove `--turbopack` from the dev script
  - Clear cache: `rm -rf .next`


