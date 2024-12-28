export const formatDate = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateString);
            return '';
        }

        // Only format the date part using Intl.DateTimeFormat
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);

    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
};