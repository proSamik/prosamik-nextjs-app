import { toPng } from 'html-to-image';

/**
 * Exports a code block as an image
 * @param codeBlockElement The HTML element containing the code block
 */
export const exportCodeBlockAsImage = async (codeBlockElement: HTMLDivElement) => {
    try {
        // Create a clone of the element to manipulate
        const clonedElement = codeBlockElement.cloneNode(true) as HTMLDivElement;

        // Modify the cloned element to remove scrollbars and improve export
        const prepareCloneForExport = (clone: HTMLDivElement) => {
            // Remove any hover or opacity classes
            clone.classList.remove('group', 'relative');

            // Find and modify the syntax highlighter pre element
            const preElement = clone.querySelector('pre');
            if (preElement) {
                Object.assign(preElement.style, {
                    overflow: 'hidden',
                    maxHeight: 'none',
                    margin: '0',
                    padding: '1rem',
                });
            }

            // Ensure no scrollbars
            Object.assign(clone.style, {
                overflow: 'hidden',
                maxHeight: 'none',
                height: 'auto'
            });
        };

        // Prepare the clone
        prepareCloneForExport(clonedElement);

        // Create a temporary container to render the clone
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.appendChild(clonedElement);
        document.body.appendChild(tempContainer);

        // Use html-to-image to capture the entire code block
        const dataUrl = await toPng(clonedElement, {
            cacheBust: true,
            pixelRatio: 5, // High-density pixel ratio
            quality: 1, // Highest quality
            style: {
                transform: 'scale(1)',
                transformOrigin: 'top left',
                overflow: 'hidden'
            },
            filter: (node) => {
                // Remove specific elements we don't want in the export
                if (node.classList?.contains('opacity-0')) return false;

                // Remove language tag
                else if (node.classList?.contains('text-xs')) return false;

                return true;
            },
            imagePlaceholder: '', // Optional placeholder
        });

        // Remove temporary container
        document.body.removeChild(tempContainer);

        // Create download link
        const link = document.createElement('a');
        link.download = `code-block-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error('Failed to export code block as image', error);
    }
};