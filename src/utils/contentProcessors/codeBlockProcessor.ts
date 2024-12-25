export const processCodeBlocks = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const codeBlocks = tempDiv.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
        const codeText = block.textContent?.trim() || '';

        // Handle SVG blocks separately
        if (codeText.startsWith('<svg')) {
            // Create a wrapper to render the SVG
            const svgWrapper = document.createElement('div');
            svgWrapper.className = 'my-4 flex justify-center';

            // Create a div to decode HTML entities
            const tempDecodeDiv = document.createElement('div');
            tempDecodeDiv.innerHTML = codeText;

            // Create the SVG element
            const svgElement = tempDecodeDiv.querySelector('svg');
            if (svgElement) {
                svgElement.classList.add('max-w-full');
                svgWrapper.appendChild(svgElement);

                // Replace the original code block with the rendered SVG
                block.parentElement?.parentNode?.replaceChild(svgWrapper, block.parentElement);
            }
        } else {
            // Process regular code blocks
            // Get language class
            const languageClass = Array.from(block.classList)
                .find(cls => cls.startsWith('language-'));

            // Create wrapper div
            const wrapper = document.createElement('div');
            wrapper.className = 'relative group my-4';

            // Create pre and code elements
            const pre = document.createElement('pre');
            const code = document.createElement('code');

            // Set classes and content
            if (languageClass) {
                pre.className = languageClass;
                code.className = languageClass;
            }

            // Preserve the original content
            code.innerHTML = block.innerHTML;
            pre.appendChild(code);
            wrapper.appendChild(pre);

            // Replace original block
            if (block.parentElement?.parentNode) {
                block.parentElement.parentNode.replaceChild(wrapper, block.parentElement);
            }
        }
    });

    return tempDiv.innerHTML;
};