export const processTableContent = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Find all table elements
    const tables = tempDiv.getElementsByTagName('table');

    Array.from(tables).forEach(table => {
        // Create outer container
        const outerContainer = document.createElement('div');
        outerContainer.className = 'table-container relative mb-6';

        // Create wrapper div for horizontal scrolling
        const wrapper = document.createElement('div');
        wrapper.className = 'table-scroll-wrapper overflow-x-auto max-w-full pb-3';

        // Style the table and prevent text wrapping in headers
        table.className = 'min-w-full table-auto border-collapse whitespace-nowrap';

        // Find all th elements and prevent their text from wrapping
        const headers = table.getElementsByTagName('th');
        Array.from(headers).forEach(header => {
            header.style.whiteSpace = 'nowrap';
            header.style.position = 'sticky';
            header.style.backgroundColor = 'var(--bg-color, white)'; // Will be handled by CSS
        });

        // Add touch-action manipulation for better touch control
        wrapper.style.touchAction = 'pan-x pan-y';

        // Wrap table with the scroll wrapper
        table.parentNode?.insertBefore(outerContainer, table);
        wrapper.appendChild(table);
        outerContainer.appendChild(wrapper);

        // Add indicator for scrollable content
        const scrollIndicator = document.createElement('div');
        scrollIndicator.className = 'scroll-indicator';
        scrollIndicator.innerHTML = `
            <div class="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 text-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                <div class="p-2">
                Scroll to see more
                </div>
                

                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
            </svg>
            </div>
        `;
        outerContainer.appendChild(scrollIndicator);

        // Add scroll detection to show/hide indicator
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                const wrapper = document.currentScript.parentElement.querySelector('.table-scroll-wrapper');
                const indicator = document.currentScript.parentElement.querySelector('.scroll-indicator');
                
                function updateIndicator() {
                    const isScrollable = wrapper.scrollWidth > wrapper.clientWidth;
                    indicator.style.display = isScrollable ? 'block' : 'none';
                }

                // Update on scroll and resize
                wrapper.addEventListener('scroll', updateIndicator);
                window.addEventListener('resize', updateIndicator);
                
                // Initial check
                updateIndicator();
            })();
        `;
        outerContainer.appendChild(script);
    });

    return tempDiv.innerHTML;
};