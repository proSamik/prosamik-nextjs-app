// Soft colour wash that follows the flipping hero word. One layer per word, each fading in and out
// on the same 15s cycle as the word (see hero-art.css). Opacity-only animation, so it is cheap to paint.
// Order must match HomePage: SaaS, Desktop Apps, Mobile Apps, Extensions, MCP Servers.
const words = ['saas', 'desktop', 'mobile', 'extension', 'mcp'] as const;

export default function HeroGlow({ className }: { className: string }) {
    return (
        <div className={`hero-glow ${className}`} aria-hidden="true">
            {words.map((word) => <span key={word} className={`glow-${word}`} />)}
        </div>
    );
}
