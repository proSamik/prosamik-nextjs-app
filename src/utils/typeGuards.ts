// Type guard for error messages
export function isErrorWithMessage(error: unknown): error is { message: string } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
    );
}

// Helper to get error message
export function getErrorMessage(error: unknown): string {
    if (isErrorWithMessage(error)) {
        return error.message;
    }
    return 'An unexpected error occurred';
}