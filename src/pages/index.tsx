import { useReadmeData } from '@/hooks/useReadmeData';
import ArticleLayout from '@/components/ArticleLayout';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';

export default function Home() {
    const { data, error, loading } = useReadmeData('proSamik', 'AiReceipt');

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data) return <div>No content available</div>;

    return <ArticleLayout data={data} />;
}