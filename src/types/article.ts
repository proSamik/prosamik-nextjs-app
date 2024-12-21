export interface BackendResponse {
    content: string;
    rawContent: string;
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
    repoPath: string;  // format: "owner/repo"
    description?: string;
}

export interface RepoListResponse {
    repos: RepoListItem[];
}