# ProSamik Next.js Application

## Overview

This repository contains the standalone frontend for `prosamik.com`. It presents Samik's products, profile, experience, and skills without relying on a separate backend service.

## Routes

- `/` — product portfolio and landing page
- `/about` — profile, story, timeline, and skills
- `/404` — not-found page

## Architecture

The application currently uses the Next.js Pages Router:

- `src/pages/_app.tsx` provides the application wrapper.
- `MainLayout` supplies navigation, responsive layout, and footer.
- `HeroSection` renders the portfolio landing page.
- The About page is composed from `ProfileHeader`, `PersonalStory`, `Timeline`, and `Skills`.
- `SEO` manages page metadata and structured data.

All displayed content is defined locally in the repository. There are no backend API calls, analytics requests, newsletter forms, feedback forms, blogs, or article routes.

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 3

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run start
```
