// Display and alignment types
export type DisplayType = "inline" | "block" | "flex";
export type AlignType = "left" | "center" | "right";
export type TextStyle = "normal" | "bold" | "italic";

// Base element interface
interface BaseElement {
    type: string;
    align?: AlignType;
    display?: DisplayType;
}

// Image element
export interface ImageElement extends BaseElement {
    type: "image";
    src: string;
    alt?: string;
    height?: string;
    width?: string;
}

// Link element
export interface LinkElement extends BaseElement {
    type: "link";
    href: string;
    target?: string;
    content: ImageElement | string;
}

// Text element
export interface TextElement extends BaseElement {
    type: "text";
    content: string;
    style?: TextStyle;
}

// Heading element
export interface HeadingElement extends BaseElement {
    type: "heading";
    level: number;
    content: string;
    style?: TextStyle;
}

// Paragraph element
export interface ParagraphElement extends BaseElement {
    type: "paragraph";
    content?: string;
    elements?: ContentElement[];
}

// Combined element type
export type ContentElement = ImageElement | LinkElement | TextElement | HeadingElement | ParagraphElement;

// Section types
export interface TableCell extends BaseElement {
    type: "heading" | "image";
    level?: number;
    content?: string;
    src?: string;
    alt?: string;
}

export interface ContainerSection extends BaseElement {
    type: "container";
    align?: AlignType;
    elements: ContentElement[];
}

export interface ArticleSection extends BaseElement {
    type: "heading" | "paragraph" | "container" | "table";
    level?: number;
    content?: string;
    style?: TextStyle;
    elements?: ContentElement[];
    cells?: TableCell[][];
}

// Main interface
export interface ArticleData {
    metadata: {
        title: string;
        repo: string;
        lastUpdated: string;
    };
    content: {
        sections: ArticleSection[];
    };
}