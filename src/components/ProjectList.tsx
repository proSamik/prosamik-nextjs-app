import { ItemList } from './shared/ItemList';
import React from 'react';

interface ProjectListProps {
    repos: {
        title: string;
        repoPath: string;
        description?: string;
        tags?: string;
        views_count?: number;
    }[];
}

const ProjectList: React.FC<ProjectListProps> = ({ repos }) => {
    // Transform the repos data to match ItemCard props
    const items = repos.map(repo => ({
        title: repo.title,
        link: `/project/${encodeURIComponent(repo.title)}`,
        description: repo.description,
        tags: repo.tags,
        views_count: repo.views_count,
        repoPath: repo.repoPath  // Important as it distinguish the blog list
    }));

    return <ItemList items={items} title="My Projects" />;
};

export default ProjectList;

