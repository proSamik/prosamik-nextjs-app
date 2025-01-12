export const processInlineCode = (html: string) => {
    return html.replace(
        /`([^`]+)`/g,
        '<code class="inline-code bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400 font-mono whitespace-normal break-all inline-block max-w-full">$1</code>'
    );
};