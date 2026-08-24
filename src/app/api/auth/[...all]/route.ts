import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

const authRouteHandler = toNextJsHandler(auth);

export const GET = authRouteHandler.GET;
export const POST = authRouteHandler.POST;
