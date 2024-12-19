// src/hooks/useReadmeData.ts
"use client"; // Mark this as a client-side hook

import { useState, useEffect } from 'react';
import { BackendResponse } from '@/types/article';

export const useReadmeData = (owner: string, repo: string, title: string) => {
    const [data, setData] = useState<BackendResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true; // To avoid setting state on unmounted component

        const fetchData = async () => {
            try {
                setLoading(true); // Set loading to true when fetching starts
                setError(null); // Clear previous errors if any

                const response = await fetch(
                    `http://localhost:10000/readme?owner=${owner}&repo=${repo}`,
                    {
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                // Check if the response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType?.includes('application/json')) {
                    throw new Error('Expected JSON response but got HTML or other content.');
                }

                const responseData: BackendResponse = await response.json();
                if (isMounted) {
                    responseData.metadata.title = title; // Set title based on the parameter passed
                    setData(responseData);
                    setError(null); // Clear any previous errors
                }
            } catch (err: unknown) {
                if (isMounted) {
                    console.error('Error fetching data:', err);

                    if (err instanceof TypeError && err.message === 'Failed to fetch') {
                        setError(
                            'Cannot connect to server. Please check if the backend server is running.'
                        );
                    } else if (err instanceof Error) {
                        setError(err.message); // Set the error message
                    } else {
                        setError('An unexpected error occurred while fetching data');
                    }

                    setData(null); // Reset data on error
                }
            } finally {
                if (isMounted) {
                    setLoading(false); // Set loading to false when fetching is complete
                }
            }
        };

        fetchData().catch((err) => {
            // Optional: Additional error handling for unhandled promise rejections
            console.error('Unhandled error in fetchData:', err);
        });

        return () => {
            isMounted = false; // Clean up when the component unmounts
        };
    }, [owner, repo, title]); // Re-run effect when owner, repo, or title changes

    return { data, error, loading }; // Return the data, error, and loading states
};
