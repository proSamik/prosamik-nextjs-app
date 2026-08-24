export const ADMIN_EMAIL = (process.env.AUTH_ADMIN_EMAIL || 'samikchoudhury15@gmail.com').toLowerCase();

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
    return (email || '').toLowerCase() === ADMIN_EMAIL;
}

