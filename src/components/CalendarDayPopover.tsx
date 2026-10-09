'use client';

import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export function useCalendarPopover<T>() {
    const [selection, setSelection] = useState<{
        value: T;
        anchor: HTMLElement;
        pinned: boolean;
    } | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelHide = () => {
        if (timer.current) clearTimeout(timer.current);
    };
    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );
    return {
        selection,
        show: (value: T, anchor: HTMLElement, pinned = false) => {
            cancelHide();
            setSelection((current) =>
                current?.pinned && !pinned
                    ? current
                    : { value, anchor, pinned },
            );
        },
        cancelHide,
        hideLater: () => {
            cancelHide();
            timer.current = setTimeout(
                () =>
                    setSelection((current) =>
                        current?.pinned ? current : null,
                    ),
                250,
            );
        },
        close: () => {
            cancelHide();
            setSelection(null);
        },
    };
}

export function CalendarDayPopover({
    anchor,
    pinned,
    onClose,
    onEnter,
    onLeave,
    children,
}: {
    anchor: HTMLElement;
    pinned: boolean;
    onClose: () => void;
    onEnter: () => void;
    onLeave: () => void;
    children: ReactNode;
}) {
    const card = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ left: 12, top: 12 });
    useLayoutEffect(() => {
        const place = () => {
            if (!card.current) return;
            const box = anchor.getBoundingClientRect();
            const height = card.current.getBoundingClientRect().height;
            const width = card.current.getBoundingClientRect().width;
            const below = box.bottom + 6;
            const above = box.top - height - 6;
            setPosition({
                left: Math.max(
                    12,
                    Math.min(box.left, window.innerWidth - width - 12),
                ),
                top: Math.max(
                    12,
                    Math.min(
                        below + height <= window.innerHeight - 12
                            ? below
                            : above,
                        window.innerHeight - height - 12,
                    ),
                ),
            });
        };
        place();
        const observer = new ResizeObserver(place);
        if (card.current) observer.observe(card.current);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [anchor]);
    useEffect(() => {
        const outside = (event: PointerEvent) => {
            if (
                !card.current?.contains(event.target as Node) &&
                !anchor.contains(event.target as Node)
            )
                onClose();
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('keydown', escape);
        };
    }, [anchor, onClose]);
    return createPortal(
        <div
            ref={card}
            role="dialog"
            aria-label="Day details"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            className="fixed z-[1100] max-h-[min(360px,calc(100dvh-24px))] w-80 max-w-[calc(100vw-24px)] overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-xl"
            style={position}
        >
            {pinned && (
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close day details"
                    className="float-right ml-2 rounded px-2 text-gray-500 hover:bg-gray-100"
                >
                    ×
                </button>
            )}
            {children}
        </div>,
        document.body,
    );
}
