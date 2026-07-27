import type { Metadata } from 'next';
import ProductsSection from '@/components/ProductsSection';

export const metadata: Metadata = {
    title: 'My HONEST Experiments',
    description: 'Products and experiments built by Samik, including the problems, motivation, mistakes, learnings, and achievements behind each project.',
    alternates: { canonical: '/projects' },
};

export default function ProjectsPage() {
    return <ProductsSection variant="timeline" />;
}
