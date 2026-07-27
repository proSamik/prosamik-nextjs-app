export function toSlug(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[’']/g, '')
        .replace(/&/g, ' and ')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function getYearSlug(start: string, end: string) {
    return `${toSlug(start)}-${toSlug(end)}`;
}

export function getMilestoneSlug(title: string) {
    return toSlug(title);
}
