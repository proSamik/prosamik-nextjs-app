/**
 * Splits rendered article HTML at the section heading closest to the middle, so a signup box can sit
 * between the two halves. Returns the whole article first and an empty second half when there is
 * no heading to split on. Code samples are escaped, so `<h2` only ever starts a real heading.
 */
export function splitHtmlAtMiddle(html: string): [string, string] {
    const starts = [...html.matchAll(/<h2[\s>]/g)].map((match) => match.index ?? 0).filter((index) => index > 0);
    if (starts.length < 2) return [html, ''];
    const middle = html.length / 2;
    const at = starts.reduce((best, index) => (Math.abs(index - middle) < Math.abs(best - middle) ? index : best), starts[0]);
    return [html.slice(0, at), html.slice(at)];
}
