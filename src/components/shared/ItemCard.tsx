// components/shared/ItemCard.tsx
import React from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';

interface ItemCardProps {
    title: string;
    link: string;
    description?: string;
    tags?: string;
    views_count?: number;
}

export const ItemCard: React.FC<ItemCardProps> = ({
                                                      title,
                                                      link,
                                                      description,
                                                      tags = '',
                                                      views_count = 0
                                                  }) => {
    const tagList = tags ? tags.split(',').map(tag => tag.trim()) : [];

    return (
        <Link
            href={link}
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
                        <Eye size={20} />
                        <span>{views_count}</span>
                    </div>
                )}
            </div>
        </Link>
    );
};