import { ArticleData, ArticleSection } from '@/types/article';
import Image from 'next/image';

interface ArticleProps {
    data: ArticleData;
}

const Article = ({ data }: ArticleProps) => {
    const handleImageError = (url: string) => {
        console.log('Image failed to load:', url);
    };

    const renderImage = (section: ArticleSection, index: number) => {
        const imageUrl = section.url || '';

        return (
            <div key={index} className="my-6">
                <div className="relative h-[400px] w-full">
                    <Image
                        src={imageUrl}
                        alt={section.alt || ''}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain"
                        onError={() => handleImageError(imageUrl)}
                        priority={index < 2} // Load first two images immediately
                        quality={75}
                    />
                </div>
                {section.alt && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                        {section.alt}
                    </p>
                )}
            </div>
        );
    };

    const renderSection = (section: ArticleSection, index: number) => {
        switch (section.type) {
            case 'heading':
                return section.level === 1 ? (
                    <h1 key={index} className="text-4xl font-bold mb-6">
                        {section.content}
                    </h1>
                ) : (
                    <h2 key={index} className="text-2xl font-bold mb-4">
                        {section.content}
                    </h2>
                );

            case 'paragraph':
                return (
                    <p key={index} className="text-gray-800 mb-4">
                        {section.content}
                    </p>
                );

            case 'image':
                return renderImage(section, index);

            case 'video':
                if (section.platform === 'youtube' && section.embedUrl) {
                    return (
                        <div key={index} className="my-6 aspect-w-16 aspect-h-9">
                            <iframe
                                src={section.embedUrl}
                                className="w-full h-[400px]"
                                allowFullScreen
                                title="YouTube video player"
                            />
                        </div>
                    );
                }
                return null;

            default:
                return null;
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <article className="prose prose-lg max-w-none">
                {data.content.sections.map((section, index) =>
                    renderSection(section, index)
                )}
            </article>
        </div>
    );
};

export default Article;