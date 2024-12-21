export const processBlockquotes = (html: string) => {
    return html.replace(/<blockquote>/g, '<blockquote class="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600">');
};