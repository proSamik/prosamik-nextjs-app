export const processCenteredMedia = (html: string) => {
    return html.replace(
        /<(img|video)([^>]*)(title="([^"]*)")?([^>]*)>/g,
        (_, tag, attrs1, titleAttr, attrs2) => {
            return `
                <div class="my-4 flex justify-center items-center">
                    <${tag}${attrs1}${attrs2} class="max-w-full"${titleAttr ? ` ${titleAttr}` : ''}>
                </${tag}>
                </div>
            `;
        }
    );
};