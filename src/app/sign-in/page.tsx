import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { auth } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/admin-auth';

type SearchParams = {
    next?: string | string[];
};

type SignInPageProps = {
    searchParams: SearchParams | Promise<SearchParams>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
    const resolvedSearchParams = await searchParams;
    const headersData = await headers();
    const session = await auth.api.getSession({
        headers: headersData,
    });

    if (session?.user?.email && isAllowedAdminEmail(session.user.email)) {
        redirect('/samik-admin');
    }

    const fallbackFromParam = Array.isArray(resolvedSearchParams?.next)
        ? resolvedSearchParams.next[0]
        : resolvedSearchParams?.next;
    const fallback = fallbackFromParam || '/samik-admin';

    return (
        <main className="mx-auto flex w-full max-w-[460px] px-4 pt-12">
            <div className="w-full rounded-2xl border border-gray-200 bg-white p-6">
                <h1 className="mb-1 text-2xl font-bold">Admin login</h1>
                <p className="mb-6 text-sm text-gray-600">Sign in with the Google account to post new thoughts.</p>

                <GoogleSignInButton fallbackCallbackURL={fallback} />
            </div>
        </main>
    );
}
