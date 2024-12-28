import { ItemList } from './shared/ItemList';
import React from 'react';

interface BlogListProps {
    repos: {
        title: string;
        repoPath: string;
        description?: string;
        tags?: string;
        views_count?: number;
    }[];
}

const BlogList: React.FC<BlogListProps> = ({ repos }) => {
    // Transform the repos data to match ItemCard props
    const items = repos.map(repo => ({
        title: repo.title,
        link: `/blog/${encodeURIComponent(repo.title)}`,
        description: repo.description,
        tags: repo.tags,
        views_count: repo.views_count
    }));

    return <ItemList items={items} title="My Blogs" />;
};

export default BlogList;

