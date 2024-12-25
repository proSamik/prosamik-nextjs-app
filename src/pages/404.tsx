import Link from 'next/link';

export default function Custom404() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                    Page Not Found
                </h2>
                <p className="text-gray-500 mb-8">
                    The page you are looking for does not exist or has been moved.
                </p>
                <Link 
                    href="/" 
                    className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
