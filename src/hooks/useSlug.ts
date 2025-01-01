import { useMemo } from 'react';

interface UseSlugReturn {
    createSlug: (title: string) => string;
    matchSlug: (slug: string, title: string) => boolean;
}

export function useSlug(): UseSlugReturn {
    const createSlug = useMemo(() => {
        return (title: string): string => {
            return title
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')    // Remove special characters
                .replace(/\s+/g, '-')         // Replace spaces with hyphens
                .replace(/-+/g, '-')          // Remove consecutive hyphens
                .trim();
        };
    }, []);

    const matchSlug = useMemo(() => {
        return (slug: string, title: string): boolean => {
            const titleSlug = createSlug(title);
            return titleSlug === slug;
        };
    }, [createSlug]);

    return { createSlug, matchSlug };
}