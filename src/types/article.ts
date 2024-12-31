export interface BackendResponse {
    content: string;
    // rawContent: string;
    metadata: {
        title: string;
        repository: string;
        lastUpdated: string;
        author: string;
        description: string;
    };
}

export interface RepoListItem {
    title: string;
    repoPath: string;
    description?: string;
    tags: string;
    views_count: number;
    type: string;
    id: number;
}

export interface RepoListResponse {
    repos: RepoListItem[];
}

export interface ArticleLayoutProps {
    data: BackendResponse;
    content?: string;
}

export type ArticleLayoutType = 'blog' | 'project';