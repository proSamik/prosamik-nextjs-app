import ArticleItem from '@/components/ArticleItem';

const Home = () => {
    const articles = new Map([
        [
            'Getting Started with Next.js',
            {
                tags: ['nextjs', 'react'],
                link: 'https://github.com/proSamik/AiReceipt',
            },
        ],
        [
            'About Me',
            {
                tags: ['nextjs', 'routing'],
                link: 'https://github.com/proSamik/proSamik',
            },
        ],
        [
            'Markdown Rendering with GitHub Style',
            {
                tags: ['markdown', 'frontend'],
                link: 'https://github.com/proSamik/prosamik-frontend-app',
            },
        ],
    ]);

    const articleEntries = Array.from(articles.entries());

    return (
        <main className="max-w-[728px] mx-auto px-4 py-8">
            <h1 className="text-3xl font-serif mb-6">Articles</h1>
            <ul>
                {articleEntries.map(([title, { tags, link }], index) => (
                    <ArticleItem key={index} title={title} tags={tags} link={link} />
                ))}
            </ul>
        </main>
    );
};

export default Home;