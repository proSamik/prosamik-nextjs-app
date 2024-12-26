export default function CallToAction() {
    return (
        <div className="flex flex-col items-center bg-gray-200 dark:bg-gray-800 py-8 px-4 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
                Subscribe to my newsletter for a weekly summary of my blogs and updates.
            </p>
            <input
                type="email"
                placeholder="Enter your email"
                className="px-4 py-2 border rounded-lg mb-4 w-full md:w-1/2"
            />
            <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">
                Subscribe
            </button>
        </div>
    );
}

