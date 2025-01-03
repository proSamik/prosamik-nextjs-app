import { SearchPanel } from "@/components/shared/SearchPanel";
import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import React from 'react';
import AnimatedCardStack from "@/components/shared/AnimateCardStack";

export interface ItemCardProps {
    title: string;
    link: string;
    description?: string;
    tags?: string;
    views_count?: number;
    repoPath?: string;
    type?: string;
}

export interface ItemListProps {
    items: ItemCardProps[];
    title: string;
}

export const ItemList: React.FC<ItemListProps> = ({ items, title }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showSearch, setShowSearch] = useState(false);

    // Check for empty state based on type property
    const isEmptyState = items.length === 1 && items[0].type === 'empty';
    // Check if this is a preview list
    const isPreview = title === 'preview';

    const allTags = useMemo(() => {
        if (isEmptyState || isPreview) return [];

        const tagSet = new Set<string>();
        items.forEach(item => {
            if (item.tags) {
                item.tags.split(',').forEach((tag: string) => tagSet.add(tag.trim()));
            }
        });
        return Array.from(tagSet).sort();
    }, [items, isEmptyState, isPreview]);

    const filteredItems = useMemo(() => {
        if (isEmptyState || isPreview) return items;

        return items.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());

            if (selectedTags.length === 0) return matchesSearch;
            if (!item.tags) return false;

            return matchesSearch && selectedTags.every(tag =>
                item.tags?.toLowerCase().includes(tag.toLowerCase())
            );
        });
    }, [items, searchTerm, selectedTags, isEmptyState, isPreview]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <>
            {!isPreview && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-serif dark:text-white">{title}</h1>
                        {!isEmptyState && (
                            <button
                                onClick={() => setShowSearch(!showSearch)}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                aria-label="Toggle search"
                            >
                                <SearchIcon />
                            </button>
                        )}
                    </div>

                    {showSearch && !isEmptyState && (
                        <SearchPanel
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            allTags={allTags}
                            selectedTags={selectedTags}
                            onTagToggle={toggleTag}
                            title={title}
                        />
                    )}
                </>
            )}

            <div className={`space-y-2`}>
                {isEmptyState ? (
                    <div className="text-center py-8">
                        <p className="text-xl text-gray-500 dark:text-gray-400 mb-2">
                            {items[0].title}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500">
                            {items[0].description}
                        </p>
                    </div>
                ) : (
                    // <div className={isPreview ? 'grid gap-2 px-4' : ''}>
                    //     {filteredItems.map((item) => (
                    //         <div key={item.link} >
                    //             <ItemCard {...item} />
                    //         </div>
                    //     ))}
                    // </div>

                    <AnimatedCardStack items={filteredItems} isPreview={isPreview} />
                )}
            </div>
        </>
    );
};