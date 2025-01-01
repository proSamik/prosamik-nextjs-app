import { ItemList } from './shared/ItemList';
import React from 'react';
import {useSlug} from "@/hooks/useSlug";

interface ContentListProps {
    repos: {
        title: string;
        repoPath: string;
        description?: string;
        tags?: string;
        views_count?: number;
        type?: string;
    }[];
    type: 'blog' | 'project';
}

const ContentList: React.FC<ContentListProps> = ({ repos, type }) => {
    const { createSlug } = useSlug();

    const items = repos.map(repo => ({
        title: repo.title,
        link: `/${type}/${createSlug(repo.title)}`,
        description: repo.description,
        tags: repo.tags,
        views_count: repo.views_count,
        type: repo.type,
        ...(type === 'project' && { repoPath: repo.repoPath })
    }));

    const title = type === 'blog' ? 'My Blogs' : 'My Projects';

    return <ItemList items={items} title={title} />;
};

export default ContentList;