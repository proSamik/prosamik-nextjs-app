import { useCallback } from 'react';
import { config } from '@/config';

export const useTrackViews = () => {
    const trackView = useCallback(async (type: string, id: number) => {
        try {
            const url = new URL(`${config.baseUrl}${config.apiEndpoints.analytics}`);
            url.searchParams.append('type', type);
            url.searchParams.append('id', id.toString());

            // Fire and forget POST request
            fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
                .catch(err => {
                    // Silently fail as per requirements
                    console.error('Failed to track view:', err);
                });

        } catch (err) {
            // Silently fail as per requirements
            console.error('Failed to track view:', err);
        }
    }, []); // Empty dependency array since trackView doesn't depend on any props or state

    return { trackView };
};