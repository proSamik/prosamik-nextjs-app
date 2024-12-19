import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import ArticleLayout from '@/components/ArticleLayout'; // Assuming you have the layout in the components folder
import { BackendResponse } from '@/types/article'; // Assuming you have a type for the article

const Slug = () => {
    const router = useRouter();
    const { slug } = router.query; // Get the slug from the URL
    const [articleData, setArticleData] = useState<BackendResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!slug) return; // Wait for the slug to be available

        // Fetch the article data from an API or your data source
        const fetchArticleData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/articles/${slug}`); // Adjust this to your actual API endpoint
                const data = await res.json();
                setArticleData(data);
            } catch (error) {
                console.error('Error fetching article data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticleData();
    }, [slug]);

    if (loading) return <div>Loading...</div>;

    if (!articleData) return <div>Article not found</div>;

    return <ArticleLayout data={articleData} />;
};

export default Slug;

