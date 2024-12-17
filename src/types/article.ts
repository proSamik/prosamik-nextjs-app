export interface ArticleSection {
    type: "heading" | "paragraph" | "image" | "video";
    level?: number;
    content?: string;
    alt?: string;
    url?: string;
    dimensions?: {
        width: number | null;
        height: number | null;
    } | null;  // Allow dimensions to be null
    platform?: string;
    embedUrl?: string;
}

export interface ArticleData {
    metadata: {
        title: string;
        repo: string;
        lastUpdated: string;
    };
    content: {
        sections: ArticleSection[];
    };
}