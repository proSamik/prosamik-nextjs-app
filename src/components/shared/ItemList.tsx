// components/shared/ItemList.tsx
import { SearchPanel } from "@/components/shared/SearchPanel";
import { SearchIcon } from "lucide-react";
import { ItemCard } from "@/components/shared/ItemCard";
import { useMemo, useState } from "react";
import React from 'react';

// Define ItemCardProps interface
interface ItemCardProps {
    title: string;
    link: string;
    description?: string;
    tags?: string;
    views_count?: number;
    repoPath?: string;
}

interface ItemListProps {
    items: ItemCardProps[];
    title: string;
}

export const ItemList: React.FC<ItemListProps> = ({ items, title }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showSearch, setShowSearch] = useState(false);

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        items.forEach(item => {
            if (item.tags) {
                item.tags.split(',').forEach((tag: string) => tagSet.add(tag.trim()));
            }
        });
        return Array.from(tagSet).sort();
    }, [items]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());

            if (selectedTags.length === 0) return matchesSearch;
            if (!item.tags) return false;

            return matchesSearch && selectedTags.every(tag =>
                item.tags?.toLowerCase().includes(tag.toLowerCase())
            );
        });
    }, [items, searchTerm, selectedTags]);

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
                <h1 className="text-3xl font-serif dark:text-white">{title}</h1>
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
                    title={title}
                />
            )}

            <div className="space-y-4">
                {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                        <ItemCard
                            key={item.link}
                            {...item}
                        />
                    ))
                ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No {title.toLowerCase()} found matching your criteria
                    </div>
                )}
            </div>
        </>
    );
};