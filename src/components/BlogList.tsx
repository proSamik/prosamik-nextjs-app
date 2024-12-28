import React, { useState, useMemo } from 'react';
import Link from 'next/link';

interface BlogCardProps {
    title: string;
    repoPath: string;
    description?: string;
    tags?: string;
    views_count?: number;
}

const EyeIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="w-5 h-5"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
    </svg>
);

const SearchIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-5 h-5"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
    </svg>
);

const BlogCard: React.FC<BlogCardProps> = ({ title, repoPath, description, tags = '', views_count = 0 }) => {
    const tagList = tags ? tags.split(',').map(tag => tag.trim()) : [];

    return (
        <Link
            key={repoPath}
            href={`/blog/${encodeURIComponent(title)}`}
            className="block p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md dark:hover:shadow-lg transition-shadow"
        >
            <h2 className="text-xl font-semibold mb-2 dark:text-white">{title}</h2>
            {description && (
                <p className="text-gray-600 dark:text-gray-300 mb-3">{description}</p>
            )}
            <div className="flex justify-between items-center">
                {tagList.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {tagList.map((tag) => (
                            <span
                                key={tag}
                                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
                {views_count > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <EyeIcon />
                        <span>{views_count}</span>
                    </div>
                )}
            </div>
        </Link>
    );
};

interface SearchPanelProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    allTags: string[];
    selectedTags: string[];
    onTagToggle: (tag: string) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
                                                     searchTerm,
                                                     setSearchTerm,
                                                     allTags,
                                                     selectedTags,
                                                     onTagToggle
                                                 }) => {
    const [tagSearchTerm, setTagSearchTerm] = useState('');
    const [showAllTags, setShowAllTags] = useState(false);

    const filteredTags = useMemo(() => {
        return allTags.filter(tag =>
            tag.toLowerCase().includes(tagSearchTerm.toLowerCase())
        );
    }, [allTags, tagSearchTerm]);

    const displayTags = showAllTags ? filteredTags : filteredTags.slice(0, 5);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-4 mb-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Search Posts
                </label>
                <input
                    type="text"
                    placeholder="Search by title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filter by Tags
                </label>
                <input
                    type="text"
                    placeholder="Search tags..."
                    value={tagSearchTerm}
                    onChange={(e) => setTagSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
            </div>

            <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                    {displayTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => onTagToggle(tag)}
                            className={`px-3 py-1 text-sm rounded-full transition-colors
                                ${selectedTags.includes(tag)
                                ? 'bg-blue-500 text-white dark:bg-blue-600'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            #{tag}
                        </button>
                    ))}
                    {filteredTags.length > 5 && (
                        <button
                            onClick={() => setShowAllTags(!showAllTags)}
                            className="px-3 py-1 text-sm text-blue-500 dark:text-blue-400 hover:underline"
                        >
                            {showAllTags ? 'Show less' : `+${filteredTags.length - 5} more`}
                        </button>
                    )}
                </div>
                {filteredTags.length === 0 && tagSearchTerm && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No tags found matching &ldquo;{tagSearchTerm}&rdquo;
                    </p>
                )}
            </div>
        </div>
    );
};

interface BlogListProps {
    repos: BlogCardProps[];
}

const BlogList: React.FC<BlogListProps> = ({ repos }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showSearch, setShowSearch] = useState(false);

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        repos.forEach(repo => {
            if (repo.tags) {
                repo.tags.split(',').forEach(tag => tagSet.add(tag.trim()));
            }
        });
        return Array.from(tagSet).sort();
    }, [repos]);

    const filteredRepos = useMemo(() => {
        return repos.filter(repo => {
            const matchesSearch = repo.title.toLowerCase().includes(searchTerm.toLowerCase());

            if (selectedTags.length === 0) return matchesSearch;
            if (!repo.tags) return false;

            return matchesSearch && selectedTags.every(tag =>
                repo.tags?.toLowerCase().includes(tag.toLowerCase())
            );
        });
    }, [repos, searchTerm, selectedTags]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-serif dark:text-white">My Blog Posts</h1>
                <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="Toggle search"
                >
                    <SearchIcon />
                </button>
            </div>

            {showSearch && (
                <SearchPanel
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    allTags={allTags}
                    selectedTags={selectedTags}
                    onTagToggle={toggleTag}
                />
            )}

            <div className="space-y-4">
                {filteredRepos.length > 0 ? (
                    filteredRepos.map((repo) => (
                        <BlogCard
                            key={repo.repoPath}
                            {...repo}
                        />
                    ))
                ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No posts found matching your criteria
                    </div>
                )}
            </div>
        </>
    );
};

export default BlogList;