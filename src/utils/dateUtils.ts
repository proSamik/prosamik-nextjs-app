export const formatDate = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateString);
            return '';
        }

        const dateStr = new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).format(date);

        const timeStr = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);

        return `${dateStr} at ${timeStr}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
};
