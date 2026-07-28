import { dataTimelineData } from '@/utils/dataTimelineData';
import { getMilestoneSlug, getYearSlug } from '@/utils/slugs';

export const milestoneYears = dataTimelineData.map((period) => ({
    year: getYearSlug(period.yearRange.start, period.yearRange.end),
    yearRange: period.yearRange,
    events: period.events,
}));

export const milestones = dataTimelineData.flatMap((period) =>
    period.events
        .filter((event) => !event.projectSlug)
        .map((event) => ({
            year: getYearSlug(period.yearRange.start, period.yearRange.end),
            slug: getMilestoneSlug(event.title),
            yearRange: period.yearRange,
            event,
        }))
);

export function getMilestone(year: string, milestone: string) {
    return milestones.find((item) => item.year === year && item.slug === milestone);
}

export function getMilestoneYear(year: string) {
    return milestoneYears.find((item) => item.year === year);
}
