export const processCenteredMedia = (html: string) => {
    return html.replace(
        /<(img|video|iframe)([^>]*)(title="([^"]*)")?([^>]*)>/g,
        (match, tag, attrs1, titleAttr, title, attrs2) => {
            const titleHtml = title
                ? `<div class="text-center mb-2 font-semibold">${title}</div>`
                : '';
            return `
                    <div class="my-4 flex flex-col items-center">
                        ${titleHtml}
                        <${tag}${attrs1} ${attrs2} class="max-w-full"${titleAttr ? ` ${titleAttr}` : ''}>
                    </div>
                `;
        }
    );
};