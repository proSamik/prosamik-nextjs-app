import React, { useRef } from 'react';
import {CodeBlockHeader, ThemedSyntaxHighlighter} from "@/components/article/CodeBlockComponents";
/**
 * Main CodeBlock Component
 * Combines CodeBlockHeader and ThemedSyntaxHighlighter
 */
export const CodeBlock = ({ language, code }: { language: string; code: string }) => {
    const codeBlockRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={codeBlockRef} className="p-2 dark:bg-gray-300 rounded relative group">
            <div className="bg-[#f8f8f8] dark:bg-[#282c34] rounded-lg overflow-hidden">
                <CodeBlockHeader language={language}/>
                <ThemedSyntaxHighlighter language={language} code={code}/>
            </div>
        </div>
    );
};
