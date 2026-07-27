import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md text-center">
                <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
                <h2 className="mb-4 text-2xl font-semibold text-gray-700">Page Not Found</h2>
                <p className="mb-8 text-gray-500">
                    The page you are looking for does not exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="inline-block rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
