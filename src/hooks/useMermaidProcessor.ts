import { useEffect, RefObject } from 'react';
import type { MermaidConfig } from 'mermaid';

// Define types for Mermaid instance
interface MermaidAPI {
    render: (id: string, text: string) => Promise<{ svg: string }>;
    initialize: (config: ExtendedMermaidConfig) => void;
}
// Extend the MermaidConfig type with our additional properties
type ExtendedMermaidConfig = MermaidConfig & {
    startOnLoad?: boolean;
    securityLevel?: 'strict' | 'loose' | 'antiscript';
    flowchart?: {
        useMaxWidth?: boolean;
    };
    sequence?: {
        useMaxWidth?: boolean;
        actorMargin?: number;
        messageMargin?: number;
        boxMargin?: number;
        boxTextMargin?: number;
        noteMargin?: number;
        actorFontSize?: number;
        noteFontSize?: number;
        messageFontSize?: number;
    };
    themeVariables?: {
        background?: string;
        primaryColor?: string;
        primaryBorderColor?: string;
        primaryTextColor?: string;
        secondaryColor?: string;
        tertiaryColor?: string;
        lineColor?: string;
        textColor?: string;
        mainBkg?: string;
        nodeBorder?: string;
        clusterBkg?: string;
        clusterBorder?: string;
        labelBackground?: string;
        labelBorder?: string;
        labelTextColor?: string;
    };
};

// Define type for the debounced function
type DebouncedFunction<T extends (...args: never[]) => void> = (...args: Parameters<T>) => void;

export const useMermaidProcessor = (
    contentRef: RefObject<HTMLDivElement | null>,
    contentString: string
) => {

    const generateUniqueId = () => {
        return 'mermaid-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    };

    useEffect(() => {
        const currentRef = contentRef.current;
        let mermaidInstance: MermaidAPI | null = null;

        const zoomControlsMap = new Map<HTMLElement, HTMLElement>();

        // Typed debounce function
        const debounce = <T extends (...args: never[]) => void>(
            func: T,
            wait: number
        ): DebouncedFunction<T> => {
            let timeout: NodeJS.Timeout;

            return (...args: Parameters<T>) => {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };


        const handleResize = debounce(async () => {
            if (!currentRef) return;

            const mermaidDivs = currentRef.querySelectorAll<HTMLElement>('.mermaid');
            for (const div of Array.from(mermaidDivs)) {
                await renderDiagram(div);
            }
        }, 250);

        const renderDiagram = async (div: HTMLElement) => {
            try {
                if (!mermaidInstance) return null;

                const originalContent = div.getAttribute('data-original-content') || div.textContent || '';

                // Use new ID generation method
                const { svg } = await mermaidInstance.render(
                    generateUniqueId(),
                    originalContent
                );

                // Create a wrapper for the SVG content
                const svgWrapper = document.createElement('div');
                svgWrapper.className = 'mermaid-svg-wrapper w-full overflow-auto';
                svgWrapper.style.cssText = `
                    min-width: 100%;
                    min-height: 200px;
                    max-height: 400px;
                    overflow-x: auto;
                    overflow-y: auto;
                    padding: 1rem;
                    background: white;
                    position: relative;
                `;

                // Add the SVG content
                svgWrapper.innerHTML = svg;
                div.innerHTML = '';
                div.appendChild(svgWrapper);
                div.setAttribute('data-processed', 'true');

                if (!div.getAttribute('data-original-content')) {
                    div.setAttribute('data-original-content', originalContent);
                }

                // Ensure SVG has proper styling
                const svgElement = svgWrapper.querySelector('svg');
                if (svgElement) {
                    svgElement.style.backgroundColor = '#ffffff';

                    // Measure container and SVG
                    const containerWidth = svgWrapper.clientWidth;
                    const svgWidth = svgElement.getAttribute('width') ?
                        parseFloat(svgElement.getAttribute('width')!) :
                        svgElement.getBoundingClientRect().width;

                    // Calculate initial scale
                    const initialScale = containerWidth / svgWidth;

                    svgElement.style.transform = `scale(${initialScale})`;
                    svgElement.style.transformOrigin = 'top left';

                    // Adjust wrapper height to accommodate scaled SVG
                    svgWrapper.style.height = `${svgElement.getBoundingClientRect().height * initialScale}px`;
                }

                // Re-add zoom controls if they existed before
                const controls = zoomControlsMap.get(div);
                if (controls) {
                    controls.remove();
                    zoomControlsMap.delete(div);
                }
                addZoomControls(div);

                return svg;
            } catch (error) {
                console.error('Error rendering diagram:', error instanceof Error ? error.message : 'Unknown error');
                return null;
            }
        };

        const initializeMermaid = async () => {
            if (typeof window === 'undefined') return;

            try {
                const mermaid = (await import('mermaid')).default;
                mermaidInstance = mermaid;

                const config: ExtendedMermaidConfig = {
                    startOnLoad: true,
                    theme: 'default',
                    securityLevel: 'loose',
                    flowchart: {
                        useMaxWidth: false,
                    },
                    sequence: {
                        useMaxWidth: false,
                        actorMargin: 50,
                        messageMargin: 35,
                        boxMargin: 10,
                        boxTextMargin: 5,
                        noteMargin: 10,
                        actorFontSize: 14,
                        noteFontSize: 14,
                        messageFontSize: 14,
                    },
                    themeVariables: {
                        background: '#ffffff',
                        primaryColor: '#ffffff',
                        primaryBorderColor: '#374151',
                        primaryTextColor: '#111827',
                        secondaryColor: '#ffffff',
                        tertiaryColor: '#ffffff',
                        lineColor: '#374151',
                        textColor: '#111827',
                        mainBkg: '#ffffff',
                        nodeBorder: '#374151',
                        clusterBkg: '#ffffff',
                        clusterBorder: '#374151',
                        labelBackground: '#ffffff',
                        labelBorder: '#374151',
                        labelTextColor: '#111827'
                    }
                };

                mermaid.initialize(config);

                if (!currentRef) return;

                const mermaidDivs = currentRef.querySelectorAll<HTMLElement>('.mermaid');
                const addedControls: HTMLElement[] = [];

                for (const div of Array.from(mermaidDivs)) {
                    try {
                        // Create wrapper with white background
                        let wrapper = div.closest('.mermaid-wrapper');
                        if (!wrapper) {
                            wrapper = document.createElement('div');
                            wrapper.className = 'mermaid-wrapper relative overflow-x-auto my-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white';
                            div.parentNode?.insertBefore(wrapper, div);
                            wrapper.appendChild(div);
                        }

                        // Render the diagram
                        await renderDiagram(div);

                        // Add zoom controls
                        const controls = addZoomControls(div);
                        if (controls) addedControls.push(controls);
                    } catch (error) {
                        console.error('Error processing mermaid diagram:', error);
                    }
                }

                // Add resize listener
                window.addEventListener('resize', handleResize);

                return addedControls;
            } catch (error) {
                console.error('Error loading mermaid:', error);
                return [];
            }
        };

        const addZoomControls = (container: HTMLElement): HTMLElement | null => {
            // Find the SVG wrapper and SVG
            const svgWrapper = container.querySelector('.mermaid-svg-wrapper');
            const svg = svgWrapper?.querySelector('svg');

            if (!svg) {
                return null;
            }

            // Remove existing controls if any
            const existingControls = container.querySelector('.zoom-controls');
            existingControls?.remove();

            // Create controls container
            const controls = document.createElement('div');
            controls.className = 'zoom-controls';


            // Closure to manage scale
            const zoomManager = (() => {
                let scale = 1;

                const createButton = (text: string, action: 'in' | 'out' | 'reset') => {
                    const button = document.createElement('button');
                    button.textContent = text;


                    button.addEventListener('click', () => {
                        switch(action) {
                            case 'in':
                                scale = Math.min(scale + 0.1, 2);
                                break;
                            case 'out':
                                scale = Math.max(scale - 0.1, 0.5);
                                break;
                            case 'reset':
                                scale = 1;
                                break;
                        }

                        // Apply transform directly to SVG
                        svg.style.transform = `scale(${scale})`;
                        svg.style.transformOrigin = 'center';


                    });

                    return button;
                };

                return {
                    zoomInBtn: createButton('+', 'in'),
                    zoomOutBtn: createButton('-', 'out'),
                    resetBtn: createButton('↺', 'reset')
                };
            })();

            // Append buttons
            controls.append(
                zoomManager.zoomInBtn,
                zoomManager.zoomOutBtn,
                zoomManager.resetBtn
            );

            // Ensure container has relative positioning
            const wrapper = container.closest('.mermaid-wrapper') || container;
            (wrapper as HTMLElement).style.position = 'relative';

            // Append controls to the wrapper
            wrapper.appendChild(controls);

            return controls;
        };

        let controlsArray: HTMLElement[] = [];
        initializeMermaid().then(controls => {
            if (controls) controlsArray = controls;
        });

        // Cleanup function
        return () => {
            controlsArray.forEach(control => control.remove());
            window.removeEventListener('resize', handleResize);
        };
    }, [contentRef, contentString]);
};