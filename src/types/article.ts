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