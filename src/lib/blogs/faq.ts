// Pure helpers for the "## FAQ" section of a post. No server-only imports so tests can run them directly.

export interface BlogFaq {
    question: string;
    answer: string;
}

/** Pulls `### question` + answer pairs out of the "## FAQ" section (for schema.org FAQPage). */
export function extractFaqs(body: string): BlogFaq[] {
    const lines = body.split(/\r?\n/);
    const start = lines.findIndex((line) => /^##\s+(?:FAQ|Frequently asked questions)\s*$/i.test(line));
    if (start === -1) return [];
    const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
    const section = lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
    const faqs: BlogFaq[] = [];
    for (const block of section.split(/^###\s+/m).slice(1)) {
        const [question, ...answer] = block.split(/\r?\n/);
        const answerText = answer.join('\n').trim();
        if (question.trim() && answerText) faqs.push({ question: question.trim(), answer: answerText });
    }
    return faqs;
}

/** Markdown to plain text for structured data: drops links (keeps the label), code fences and emphasis marks. */
export function faqPlainText(markdown: string): string {
    return markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[`*_]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
