import { FaGithub, FaYoutube } from 'react-icons/fa';
import {
    buildRollingGraph,
    formatCardStreak,
    type ShareableConsistencyData,
} from '@/lib/consistencyCardData';

function PlatformHeader({ data }: { data: ShareableConsistencyData }) {
    return (
        <header className="flex items-center gap-2.5 border-b border-gray-200 px-4 py-3 sm:px-5">
            {data.platform === 'github'
                ? <FaGithub className="h-5 w-5 text-gray-900" />
                : <FaYoutube className="h-5 w-5 text-red-600" />}
            <div className="min-w-0">
                <strong className="block text-sm leading-4">{data.platformName}</strong>
                <a href={data.profileUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-gray-500 hover:underline">
                    {data.profileLabel}
                </a>
            </div>
        </header>
    );
}

export function CompactStreakCard({ data }: { data: ShareableConsistencyData }) {
    const stats = [
        { value: data.total.toLocaleString('en-US'), label: data.totalLabel, range: data.totalRange },
        { value: data.currentStreak.length, label: 'Current Streak', range: formatCardStreak(data.currentStreak), accent: true },
        { value: data.longestStreak.length, label: 'Longest Streak', range: formatCardStreak(data.longestStreak) },
    ];

    return (
        <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <PlatformHeader data={data} />
            <div className="grid grid-cols-3 divide-x divide-gray-200">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex min-h-32 flex-col items-center justify-center px-2 py-4 text-center sm:min-h-36 sm:px-4">
                        {stat.accent ? (
                            <div
                                className="flex h-16 w-16 items-center justify-center rounded-full border-4"
                                style={{ borderColor: data.accent }}
                            >
                                <strong className="text-2xl font-bold">{stat.value}</strong>
                            </div>
                        ) : (
                            <strong className="text-2xl font-bold sm:text-3xl">{stat.value}</strong>
                        )}
                        <span className="mt-2 text-xs font-medium sm:text-sm" style={stat.accent ? { color: data.accent } : undefined}>{stat.label}</span>
                        <span className="mt-2 text-[10px] leading-4 text-gray-500 sm:text-xs">{stat.range}</span>
                    </div>
                ))}
            </div>
        </article>
    );
}

export function CompactGraphCard({ data }: { data: ShareableConsistencyData }) {
    const graph = buildRollingGraph(data.days);

    return (
        <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <PlatformHeader data={data} />
            <div className="px-4 py-3 sm:px-5">
                <h2 className="text-sm font-medium text-gray-700 sm:text-base">
                    {graph.total.toLocaleString('en-US')} {data.activityName} in the last 365 days
                </h2>
                <div className="mt-3 overflow-x-auto pb-1">
                    <div className="flex min-w-max">
                        <div className="mr-2 mt-5 grid h-[88px] grid-rows-7 gap-[2px] text-[10px] text-gray-500">
                            <span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span />
                        </div>
                        <div>
                            <div className="mb-1 flex h-4">
                                {graph.monthLabels.map((label, index) => (
                                    <span key={`${label}-${index}`} className="w-[13px] text-[9px] text-gray-500">{label}</span>
                                ))}
                            </div>
                            <div className="flex gap-[2px]">
                                {graph.weeks.map((week, weekIndex) => (
                                    <div key={weekIndex} className="flex flex-col gap-[2px]">
                                        {week.map((day, dayIndex) => (
                                            <span
                                                key={day?.date ?? `${weekIndex}-${dayIndex}`}
                                                className="h-[11px] w-[11px] rounded-[2px]"
                                                style={{ backgroundColor: day ? data.colors[day.level] : 'transparent' }}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-2 flex items-center justify-end text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                        Less
                        {data.colors.map((color) => <i key={color} className="h-[10px] w-[10px] rounded-[2px]" style={{ backgroundColor: color }} />)}
                        More
                    </span>
                </div>
            </div>
        </article>
    );
}
