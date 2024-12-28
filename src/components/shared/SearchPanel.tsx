// components/shared/SearchPanel.tsx
import { useMemo, useState } from "react";
import React from 'react';

interface SearchPanelProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    allTags: string[];
    selectedTags: string[];
    onTagToggle: (tag: string) => void;
    title: string;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
                                                            searchTerm,
                                                            setSearchTerm,
                                                            allTags,
                                                            selectedTags,
                                                            onTagToggle,
                                                            title
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
                    Search {title}
                </label>
                <input
                    type="text"
                    placeholder={`Search by title...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                        No tags found matching &quot;{tagSearchTerm}&quot;
                    </p>
                )}
            </div>
        </div>
    );
};