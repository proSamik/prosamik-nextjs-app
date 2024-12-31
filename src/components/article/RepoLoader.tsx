import React from 'react';
import Loading from '@/components/layout/Loading';
import ErrorMessage from '@/components/layout/ErrorMessage';

interface RepoLoaderProps {
    loading: boolean;
    error: unknown;
    children: React.ReactNode;
}

const getErrorMessage = (err: unknown) => {
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in err) return (err as { message: string }).message;
    return 'An unexpected error occurred';
};

const RepoLoader: React.FC<RepoLoaderProps> = ({ loading, error, children }) => {
    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={getErrorMessage(error)} />;
    return <>{children}</>;
};

export default RepoLoader;

