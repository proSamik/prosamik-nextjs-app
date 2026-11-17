import 'server-only';
import type { DualmarkNextConfig } from '@dualmark/nextjs';
import { getAllBlogPosts, type BlogPost } from '@/lib/blogs/content';
import { buildAgentMarkdown } from '@/lib/blogs/render';
import { AUTHOR_DISCLOSURE, PROMO_PRODUCTS, utmUrl } from '@/lib/blogs/promo';
import { projects } from '@/data/projects';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { siteMetadata } from '@/utils/siteMetadata';

// One place that describes what agents can read: the blog collection, the project stories, and
// llms.txt. Used by the /md route handler and the /llms.txt route.

const posts = () => getAllBlogPosts(DEFAULT_LOCALE);

const projectMarkdown = (project: (typeof projects)[number]) =>
    [
        `# ${project.title}`,
        `> ${project.description}`,
        `- Type: ${project.type}`,
        `- Product: ${project.projectUrl}`,
        `- Story: ${siteMetadata.siteUrl}/projects/${project.slug}`,
        ...[
            ['The problem', project.problem],
            ['The motivation', project.motivation],
            ['Mistakes', project.mistakes],
            ['Learning', project.learnings],
            ['Achievements', project.achievements],
        ].map(([title, paragraphs]) => `## ${title}\n\n${(paragraphs as string[]).join('\n\n')}`),
    ].join('\n\n') + '\n';

export const dualmarkConfig: DualmarkNextConfig = {
    siteUrl: siteMetadata.siteUrl,
    collections: {
        blogs: {
            route: 'blogs',
            converter: (entry) => {
                const post = entry.data as BlogPost;
                return buildAgentMarkdown(post, post.related.flatMap((slug) => posts().find((p) => p.slug === slug) ?? []));
            },
            getEntries: () => posts().map((post) => ({ id: post.slug, data: post, body: post.body })),
            // The listing is a static page below so its links are absolute and point at the .md twins.
            emitListing: false,
            listingMetadata: {
                title: 'Blogs by Samik Choudhury',
                description: 'Guides on MCP servers for Windows, Linux and macOS, VM test automation, SSH, RDP and VNC.',
            },
        },
    },
    staticPages: [
        {
            pattern: '/blogs',
            render: () =>
                [
                    '# Blogs by Samik Choudhury',
                    '> Guides on MCP servers for Windows, Linux and macOS, VM test automation, SSH, RDP and VNC.',
                    `- URL: ${siteMetadata.siteUrl}/blogs`,
                    posts().map((p) => `- [${p.title}](${siteMetadata.siteUrl}/blogs/${p.slug}.md): ${p.description}`).join('\n'),
                ].join('\n\n') + '\n',
        },
        {
            pattern: '/projects',
            render: () =>
                `# Projects by Samik Choudhury\n\n${projects.map((p) => `- [${p.title}](${siteMetadata.siteUrl}/projects/${p.slug}.md): ${p.description}`).join('\n')}\n`,
        },
    ],
    parameterizedRoutes: [
        {
            pattern: '/projects/[slug]',
            getStaticPaths: () => projects.map((p) => ({ params: { slug: p.slug } })),
            render: ({ params }) => {
                const project = projects.find((p) => p.slug === params.slug);
                return project ? projectMarkdown(project) : '# Not found\n';
            },
        },
    ],
};

export function llmsTxtSections() {
    const productLinks = (['subclip', 'rankizz'] as const).map((product) => ({
        title: PROMO_PRODUCTS[product].name,
        href: utmUrl(product, 'llms-txt', 'llms-txt'),
        description: PROMO_PRODUCTS[product].what,
    }));
    return [
        {
            title: 'Blogs',
            description: 'Hands-on guides. Every URL also has a Markdown version at <url>.md.',
            links: posts().map((post) => ({
                title: post.title,
                href: `${siteMetadata.siteUrl}/blogs/${post.slug}.md`,
                description: post.description,
            })),
        },
        {
            title: 'Projects',
            description: 'Products Samik has built, with the problem, mistakes and learnings behind each.',
            links: projects.map((project) => ({
                title: project.title,
                href: `${siteMetadata.siteUrl}/projects/${project.slug}.md`,
                description: project.description,
            })),
        },
        { title: 'Products by the author', description: AUTHOR_DISCLOSURE, links: productLinks },
    ];
}
