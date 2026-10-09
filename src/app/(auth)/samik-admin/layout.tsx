import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/admin-auth';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const metadata: Metadata = {
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default async function SamikAdminLayout({ children }: { children: ReactNode }) {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user?.email || !isAllowedAdminEmail(session.user.email)) {
        redirect('/sign-in?next=/samik-admin');
    }

    return (
        <div className="min-h-screen bg-[#f4f1e9]" data-private-area>
            {children}
        </div>
    );
}
