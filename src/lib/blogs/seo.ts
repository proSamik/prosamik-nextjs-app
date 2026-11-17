// SEO copy for the /blogs index and its paginated pages. Kept in a pure module so the lengths are tested:
// titles of 30-60 characters and descriptions of up to 160 characters, so search results don't truncate them.

export const BLOGS_TITLE = 'MCP Server, VM Testing & Coolify Guides | prosamik';
export const BLOGS_DESCRIPTION =
    'Hands-on guides by Samik: MCP servers for Windows, Linux and macOS, UTM VM test automation, SSH, RDP and deploying Next.js on Coolify.';

export function blogsTitle(page: number): string {
    return page <= 1 ? BLOGS_TITLE : `MCP, VM Testing & Coolify Guides, page ${page} | prosamik`;
}

export function blogsDescription(page: number, pages: number): string {
    return page <= 1
        ? BLOGS_DESCRIPTION
        : `Page ${page} of ${pages} of Samik's hands-on guides on MCP servers, VM test automation and Next.js deployment, with the exact commands.`;
}
