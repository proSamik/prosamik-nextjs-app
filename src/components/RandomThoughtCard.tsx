import Image from 'next/image';
import type { RandomThought } from '@/lib/random-thoughts';

function formatDate(dateIso: string) {
    const date = new Date(dateIso);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

type RandomThoughtCardProps = {
    thought: RandomThought;
};

export default function RandomThoughtCard({ thought }: RandomThoughtCardProps) {
    const wasEdited = thought.updatedAt !== thought.createdAt;

    return (
        <article className="w-full bg-white p-4 sm:p-5">
            <header className="mb-4 flex items-center gap-3">
                <Image
                    src="/me-here.jpg"
                    alt="Samik"
                    width={42}
                    height={42}
                    className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                    <p className="text-sm font-bold text-stone-950">prosamik</p>
                    <p className="text-xs text-stone-400">
                        {formatDate(thought.createdAt)}{wasEdited ? ' · edited' : ''}
                    </p>
                </div>
            </header>

            {thought.content ? (
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-stone-900">{thought.content}</p>
            ) : null}

            {thought.media.length > 0 ? (
                <div className={`mt-4 grid gap-1.5 overflow-hidden rounded-2xl bg-transparent ${thought.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {thought.media.map((media, index) => {
                        const featureFirst = thought.media.length > 2 && index === 0;
                        return (
                            <div
                                key={media.id}
                                className={`relative overflow-hidden bg-transparent ${
                                    thought.media.length === 1
                                        ? 'h-[clamp(220px,42vw,380px)]'
                                        : 'h-[clamp(160px,24vw,260px)]'
                                } ${featureFirst ? 'col-span-2 h-[clamp(200px,36vw,340px)]' : ''}`}
                            >
                                {media.type === 'video' ? (
                                    <video
                                        controls
                                        preload="metadata"
                                        playsInline
                                        className="h-full w-full bg-black object-contain"
                                        src={media.url}
                                    />
                                ) : (
                                    <img
                                        src={media.url}
                                        alt={`Random thought attachment ${index + 1}`}
                                        loading="lazy"
                                        className={`h-full w-full ${thought.media.length === 1 ? 'object-contain' : 'object-cover'}`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </article>
    );
}
