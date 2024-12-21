export const processListItems = (html: string) => {
    return html.replace(/<li>/g, '<li class="text-gray-900">');
};