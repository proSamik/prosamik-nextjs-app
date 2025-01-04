export interface TimelineEvent {
    title: string;
    description: string;
    skills: string[];
    soft_skills?: string[];
}

export interface YearRange {
    start: string;
    end: string;
    description?: string;
}

export interface TimePeriod {
    yearRange: YearRange;
    events: TimelineEvent[];
}
