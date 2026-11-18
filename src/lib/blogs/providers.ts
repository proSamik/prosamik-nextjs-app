// External products and providers. The first time each is named in a post's prose it links to the
// official site with rel="nofollow": a reader-friendly pointer, not an endorsement or an SEO signal.
// Add a row here to link a new provider everywhere; posts never hand-write these links.
export interface Provider { name: string; url: string; match?: RegExp }

export const PROVIDERS: Provider[] = [
    { name: 'New Relic', url: 'https://newrelic.com' },
    { name: 'Sentry', url: 'https://sentry.io' },
    { name: 'PostHog', url: 'https://posthog.com' },
    { name: 'Hetzner', url: 'https://www.hetzner.com/cloud' },
    { name: 'Hostinger', url: 'https://www.hostinger.com/vps-hosting' },
    { name: 'Cloudflare Tunnel', url: 'https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/' },
    { name: 'Cloudflare', url: 'https://www.cloudflare.com' },
    { name: 'Tailscale', url: 'https://tailscale.com' },
    { name: 'Spaceship', url: 'https://www.spaceship.com' },
    { name: 'Porkbun', url: 'https://porkbun.com' },
    { name: 'Namecheap', url: 'https://www.namecheap.com' },
    { name: 'Vercel', url: 'https://vercel.com' },
    { name: 'Coolify', url: 'https://coolify.io' },
    { name: 'Plunk', url: 'https://www.useplunk.com' },
    { name: 'Postiz', url: 'https://postiz.com' },
    { name: 'Payload CMS', url: 'https://payloadcms.com' },
    { name: 'Amazon SES', url: 'https://aws.amazon.com/ses/' },
    { name: 'Homebrew', url: 'https://brew.sh' },
    { name: 'btop4win', url: 'https://github.com/aristocratos/btop4win' },
    { name: 'Docker', url: 'https://www.docker.com' },
    { name: 'OpenSEO', url: 'https://github.com/every-app/open-seo' },
    { name: 'RevenueCat', url: 'https://www.revenuecat.com' },
    { name: 'App Store Connect', url: 'https://appstoreconnect.apple.com' },
    { name: 'Google Search Console', url: 'https://search.google.com/search-console' },
    { name: 'IndexNow', url: 'https://www.indexnow.org' },
    { name: 'Trustpilot', url: 'https://www.trustpilot.com' },
    { name: 'Plausible', url: 'https://plausible.io' },
    { name: 'Umami', url: 'https://umami.is' },
    { name: 'Codex', url: 'https://openai.com/codex/' },
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SKIP_TAGS = new Set(['a', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'script', 'style', 'th', 'button']);

/**
 * Links the first prose mention of each provider. Works on rendered HTML: text inside links, code,
 * headings and table headers is left alone, and a provider is linked only once per post.
 */
export function linkProviders(html: string, providers: Provider[] = PROVIDERS): string {
    const pending = providers.map((provider) => ({
        provider,
        pattern: provider.match ?? new RegExp(`(?<![\\w/@.-])${escapeRegExp(provider.name)}(?![\\w/-]|\\.\\w)`),
    }));
    const done = new Set<string>();
    const stack: string[] = [];
    let out = '';
    for (const part of html.split(/(<[^>]+>)/)) {
        if (part.startsWith('<')) {
            const tag = /^<\/?\s*([a-zA-Z0-9]+)/.exec(part);
            if (tag) {
                const name = tag[1].toLowerCase();
                if (part.startsWith('</')) { const at = stack.lastIndexOf(name); if (at !== -1) stack.length = at; }
                else if (!part.endsWith('/>') && !['br', 'img', 'hr', 'input', 'meta', 'link'].includes(name)) stack.push(name);
            }
            out += part;
            continue;
        }
        if (stack.some((name) => SKIP_TAGS.has(name)) || !part.trim()) { out += part; continue; }
        // Walk left to right, taking the earliest match of any provider not linked yet (longest name wins a tie),
        // so a link's own text is never scanned again.
        let rest = part;
        let text = '';
        for (;;) {
            let best: { provider: Provider; index: number; length: number } | null = null;
            for (const { provider, pattern } of pending) {
                if (done.has(provider.name)) continue;
                const match = pattern.exec(rest);
                if (!match) continue;
                if (!best || match.index < best.index || (match.index === best.index && match[0].length > best.length)) {
                    best = { provider, index: match.index, length: match[0].length };
                }
            }
            if (!best) break;
            done.add(best.provider.name);
            text += `${rest.slice(0, best.index)}<a href="${best.provider.url}" target="_blank" rel="nofollow noopener noreferrer">${rest.slice(best.index, best.index + best.length)}</a>`;
            rest = rest.slice(best.index + best.length);
        }
        text += rest;
        out += text;
    }
    return out;
}
