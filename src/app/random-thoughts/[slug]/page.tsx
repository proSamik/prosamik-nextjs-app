import { permanentRedirect } from 'next/navigation';

type LegacyRandomThoughtPageProps = {
    params: Promise<{ slug: string }>;
};

export default async function LegacyRandomThoughtPage({ params }: LegacyRandomThoughtPageProps) {
    const { slug } = await params;
    permanentRedirect(`/t/${encodeURIComponent(slug)}`);
}
