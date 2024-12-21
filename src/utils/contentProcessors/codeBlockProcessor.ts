export const processCodeBlocks = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const codeBlocks = tempDiv.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
        const codeText = block.textContent?.trim() || '';

        // Handle SVG blocks
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
            // Embed data for later processing of other code blocks
            block.setAttribute('data-original-html', block.innerHTML);
        }
    });

    return tempDiv.innerHTML;
};