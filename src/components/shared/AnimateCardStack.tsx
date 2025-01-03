import React, { useState, useEffect } from 'react';
import { ItemCard, ItemCardProps } from "./ItemCard";
import {StyledItemCard} from "@/components/shared/StyledItemCard";

export interface AnimatedCardStackProps {
    items: ItemCardProps[];
    isPreview?: boolean;
}

const AnimateCardStack: React.FC<AnimatedCardStackProps> = ({ items, isPreview = false }) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 650);
        };

        // Initial check
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    if (isPreview) {
        return (
            <div className={isPreview ? 'grid gap-2 px-4' : ''}>
                {items.map((item: ItemCardProps) => (
                    <div key={item.link}>
                        <ItemCard {...item} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap justify-center items-start gap-4 w-full">
            {items.map(item => (
                <StyledItemCard
                    key={item.link}
                    {...item}
                    isMobile={isMobile}
                />
            ))}
        </div>
    );
};

export default AnimateCardStack;