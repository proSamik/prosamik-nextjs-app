import { createDualmarkRouteHandler } from '@dualmark/nextjs';
import { dualmarkConfig } from '@/lib/dualmark-config';

// Internal namespace for markdown twins. The proxy rewrites /blogs/<slug>.md (and agent requests)
// here; visitors never need to type /md/.
const handler = createDualmarkRouteHandler(dualmarkConfig);

export const GET = handler.GET;
export const generateStaticParams = handler.generateStaticParams;
export const dynamic = 'force-static';
export const dynamicParams = false;
