import {
    ArticleData,
    ArticleSection,
    ContentElement,
    ImageElement,
    LinkElement,
    TextElement
} from '@/types/article';
import Image from 'next/image';
import { createElement } from 'react';

interface ArticleProps {
    data: ArticleData;
}

const Article = ({ data }: ArticleProps) => {
    const renderImage = (image: ImageElement) => {
        const isShieldBadge = image.src.includes('img.shields.io');
        const isStatsImage =
            image.src.includes('github-readme-stats.vercel.app') ||
            image.src.includes('git-hub-streak-stats.vercel.app');

        const className = `${image.display === 'inline' ? 'inline-block' : ''} ${
            image.align === 'right' ? 'float-right' :
                image.align === 'center' ? 'mx-auto' : ''
        }`;

        if (isShieldBadge) {
            return (
                <Image
                    src={image.src}
                    alt={image.alt || "Shield Badge"}
                    width={150}
                    height={20}
                    unoptimized
                    className={className}
                />
            );
        }

        if (isStatsImage) {
            return (
                <Image
                    src={image.src}
                    alt={image.alt || "GitHub Stats"}
                    width={400}
                    height={200}
                    unoptimized
                    className={className}
                />
            );
        }

        return (
            <Image
                src={image.src}
                alt={image.alt || "Content Image"}
                width={image.width ? parseInt(image.width) : 500}
                height={image.height ? parseInt(image.height) : 300}
                unoptimized
                className={className}
            />
        );
    };

    const renderLink = (link: LinkElement) => (
    <a
        href={link.href}
    target={link.target}
    className={`text-blue-500 hover:underline ${
        link.display === 'inline' ? 'inline-block' : ''
    } ${link.align === 'right' ? 'float-right' : ''}`}
    >
    {typeof link.content === 'string'
        ? link.content
        : renderElement(link.content)}
    </a>
);

    const renderText = (text: TextElement) => (
        <span
            className={`${text.display === 'inline' ? 'inline' : 'block'} ${
                text.style === 'italic' ? 'italic' : ''
            } ${text.style === 'bold' ? 'font-bold' : ''}`}
        >
            {text.content}
        </span>
    );

    const renderElement = (element: ContentElement) => {
        switch (element.type) {
            case 'image':
                return renderImage(element);
            case 'link':
                return renderLink(element);
            case 'text':
                return renderText(element);
            case 'heading':
                return createElement(
                    `h${element.level}`,
                    {
                        className: `font-bold ${
                            element.style === 'italic' ? 'italic' : ''
                        } ${element.align === 'center' ? 'text-center' : ''}`
                    },
                    element.content
                );
            case 'paragraph':
                return (
                    <p className={`${element.align === 'center' ? 'text-center' : ''} ${
                        element.display === 'flex' ? 'flex justify-between items-center' : ''
                    }`}>
                        {element.content}
                        {element.elements?.map((el, i) => (
                            <span key={i}>{renderElement(el)}</span>
                        ))}
                    </p>
                );
            default:
                return null;
        }
    };

    const renderContainer = (section: ArticleSection) => (
        <div className={`${section.align === 'center' ? 'text-center' : ''} ${
            section.display === 'flex' ? 'flex justify-between items-center' : ''
        }`}>
            {section.elements?.map((element, index) => (
                <div key={index} className={element.display === 'inline' ? 'inline-block' : 'block'}>
                    {renderElement(element)}
                </div>
            ))}
        </div>
    );

    const renderTable = (section: ArticleSection) => (
        <table className="w-full border-collapse">
            <tbody>
            {section.cells?.map((row, rowIndex) => (
                <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className={`p-4 ${cell.align === 'center' ? 'text-center' : ''}`}>
                            {cell.type === 'image'
                                ? renderImage(cell as ImageElement)
                                : cell.content}
                        </td>
                    ))}
                </tr>
            ))}
            </tbody>
        </table>
    );

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <article className="prose prose-lg max-w-none">
                {data.content.sections.map((section, index) => {
                    switch (section.type) {
                        case 'container':
                            return <div key={index}>{renderContainer(section)}</div>;
                        case 'table':
                            return <div key={index}>{renderTable(section)}</div>;
                        default:
                            return <div key={index}>{renderElement(section as ContentElement)}</div>;
                    }
                })}
            </article>
        </div>
    );
};

export default Article;