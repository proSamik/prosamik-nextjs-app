import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/admin-auth';
import type { ReactNode } from 'react';

export default async function SamikAdminLayout({ children }: { children: ReactNode }) {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user?.email || !isAllowedAdminEmail(session.user.email)) {
        redirect('/sign-in?next=/samik-admin');
    }

    return <div className="min-h-screen bg-[#f4f1e9] py-6 sm:py-10">{children}</div>;
}
