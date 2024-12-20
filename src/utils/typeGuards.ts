import { RepoSlug, repoMap } from '@/data/repos';

export function isValidSlug(slug: string): slug is RepoSlug {
    return slug in repoMap;
}
