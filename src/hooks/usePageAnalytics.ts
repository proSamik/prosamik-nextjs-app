import { useCallback } from 'react';
import { config } from '@/config';

/**
 * A custom hook for tracking page views in the application.
 * Sends a POST request to the analytics endpoint with the current page name.
 *
 * @example
 * // In your page component:
 * const { trackPageView } = usePageAnalytics();
 *
 * useEffect(() => {
 *   // Using void operator to handle the promise
 *   void trackPageView('home');
 * }, [trackPageView]); // Include trackPageView in dependencies
 */
export const usePageAnalytics = () => {
    const trackPageView = useCallback(async (page: string): Promise<void> => {
        try {
            // Construct the analytics URL with the page parameter
            const url = new URL(`${config.baseUrl}${config.apiEndpoints.analytics}`);
            url.searchParams.append('page', page);

            // Wait for the fetch to complete to properly handle any errors
            await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        } catch (err) {
            // Silently fail as per requirements
            console.error('Failed to track page view:', err);
        }
    }, []); // Empty dependency array since trackPageView doesn't depend on any props or state

    return { trackPageView };
};