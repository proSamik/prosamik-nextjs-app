import { createLlmsTxtHandler } from '@dualmark/nextjs';
import { llmsTxtSections } from '@/lib/dualmark-config';

const handler = createLlmsTxtHandler({
    brandName: 'prosamik',
    description:
        'Samik Choudhury is an indie hacker who builds Subclip (AI video editor) and Rankizz (SEO and AI search). These pages are guides and project stories; each has a Markdown version.',
    sections: llmsTxtSections(),
});

export const GET = handler.GET;
export const dynamic = 'force-static';
