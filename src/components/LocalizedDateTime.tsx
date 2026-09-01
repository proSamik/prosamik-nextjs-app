'use client';

import { useEffect, useState } from 'react';

type LocalizedDateTimeProps = {
    dateIso: string;
    timeZone: string;
};

function formatDate(dateIso: string, timeZone: string): string {
    const date = new Date(dateIso);
    const localizedDate = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        timeZone,
    }).format(date);
    const localizedTime = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
    }).format(date);

    return `${localizedDate} · ${localizedTime}`;
}

export default function LocalizedDateTime({ dateIso, timeZone }: LocalizedDateTimeProps) {
    const [label, setLabel] = useState<string | null>(null);

    useEffect(() => {
        setLabel(formatDate(dateIso, timeZone));
    }, [dateIso, timeZone]);

    return (
        <time dateTime={dateIso} title={`Saved as one UTC instant and shown in the author's ${timeZone} time zone`}>
            {label ?? <span className="inline-block h-3 w-36 animate-pulse rounded-full bg-stone-100 align-middle" aria-label="Loading local time" />}
        </time>
    );
}
