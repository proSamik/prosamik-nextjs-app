import { listRandomThoughts } from '@/lib/random-thoughts';
import RandomThoughtsAdmin from '@/components/admin/RandomThoughtsAdmin';
import SignOutButton from '@/components/auth/SignOutButton';
import Link from 'next/link';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';

export default async function SamikAdminPage() {
    const thoughts = await listRandomThoughts(50);

    return (
        <main className="mx-auto w-full max-w-[980px] px-4 pb-16 sm:px-6">
            <header className="mb-8 border-b border-stone-300 pb-7 pt-2 sm:mb-10">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
                            <LockKeyhole size={12} /> Private publishing desk
                        </div>
                        <h1 className="text-4xl font-black tracking-[-0.04em] text-stone-950 sm:text-5xl">Samik Admin</h1>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
                            A no-pressure space to write, attach, revise, and share whatever feels worth keeping.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/random-thoughts"
                            target="_blank"
                            className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 shadow-sm hover:border-stone-500"
                        >
                            View feed <ArrowUpRight size={15} />
                        </Link>
                        <SignOutButton />
                    </div>
                </div>
            </header>

            <RandomThoughtsAdmin initialThoughts={thoughts} />
        </main>
    );
}
