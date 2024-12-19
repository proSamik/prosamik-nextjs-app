// components/ArticleItem.tsx
"use client"; // Mark this as a client-side component

import { useReadmeData } from '@/hooks/useReadmeData';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';

interface ArticleItemProps {
    title: string;
    tags: string[];
    link: string;
}

const ArticleItem = ({ title, tags, link }: ArticleItemProps) => {
    const [owner, repo] = link.replace('https://github.com/', '').split('/');
    const { data, error, loading } = useReadmeData(owner, repo, title);

    return (
        <li className="mb-8">
            <a
                href={`/article/${encodeURIComponent(title)}`}
                className="text-xl text-blue-600 hover:underline"
            >
                {title}
            </a>
            <div className="text-gray-500 text-sm">
                Tags: {tags.join(', ')}
            </div>
            {loading && <Loading />}
            {error && <ErrorMessage message={error} />}
            {data && (
                <div className="text-sm text-gray-600 mt-2">
                    <p className="font-medium">Title:</p>
                    <p>{data.metadata.title}</p>
                    <p className="font-medium">Description:</p>
                    <p>{data.metadata.description || 'No description available'}</p>
                </div>
            )}
        </li>
    );
};

export default ArticleItem;
