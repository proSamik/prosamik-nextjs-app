export const processInlineCode = (html: string) => {
    return html.replace(/`([^`]+)`/g, '<code class="inline-code bg-gray-100 px-1 py-0.5 rounded-md text-red-600 font-mono">$1</code>');
};