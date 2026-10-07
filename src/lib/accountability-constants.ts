export const HABITS = [
    { key: 'physical_workout', label: 'Physical workout' },
    { key: 'direct_marketing', label: 'Direct marketing' },
    { key: 'email_writing', label: 'Email writing' },
    { key: 'video_content', label: 'Video-content work' },
] as const;

export const CHECK_IN_SLOTS = [
    { id: 'slot_0600', scheduledLocalTime: '06:00', reminderLocalTime: '07:00', label: '06:00 check-in' },
    { id: 'slot_1200', scheduledLocalTime: '12:00', reminderLocalTime: '13:00', label: '12:00 check-in' },
    { id: 'slot_1800', scheduledLocalTime: '18:00', reminderLocalTime: '19:00', label: '18:00 check-in' },
    { id: 'slot_2200', scheduledLocalTime: '22:00', reminderLocalTime: '23:00', label: 'Daily close · 22:00' },
] as const;

export type HabitKey = (typeof HABITS)[number]['key'];
export type OutreachChannel = 'email' | 'linkedin' | 'phone' | 'in_person' | 'other';
export type VideoStage = 'idea' | 'planned' | 'scripted' | 'recorded' | 'edited' | 'published';
