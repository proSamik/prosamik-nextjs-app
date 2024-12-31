import { ItemList } from './shared/ItemList';
import React from 'react';

interface ContentListProps {
    repos: {
        title: string;
        repoPath: string;
        description?: string;
        tags?: string;
        views_count?: number;
        type?: string;
    }[];
    type: 'blog' | 'project'; // This helps distinguish between blog and project
}

const ContentList: React.FC<ContentListProps> = ({ repos, type }) => {
    // Transform the repos data to match ItemCard props
    const items = repos.map(repo => ({
        title: repo.title,
        // Dynamically create link based on type
        link: `/${type}/${encodeURIComponent(repo.title)}`,
        description: repo.description,
        tags: repo.tags,
        views_count: repo.views_count,
        type: repo.type, // Make sure to pass the type property
        // Only include repoPath for projects
        ...(type === 'project' && { repoPath: repo.repoPath })
    }));

    // Dynamically set title based on type
    const title = type === 'blog' ? 'My Blogs' : 'My Projects';

    return <ItemList items={items} title={title} />;
};

export default ContentList;