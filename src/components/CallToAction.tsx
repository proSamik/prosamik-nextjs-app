import React, { useState } from 'react';
import { useSubscribeNewsletter } from '@/hooks/useSubscribeNewsletter';

export default function CallToAction() {
    const [email, setEmail] = useState('');
    const { response, error, loading, subscribe } = useSubscribeNewsletter();

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleInputSanitization = (input: string) => {
        return input.replace(/['"\\;%]/g, '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const sanitizedEmail = handleInputSanitization(email.trim());

        if (!validateEmail(sanitizedEmail)) {
            alert('Please enter a valid email address.');
            return;
        }

        await subscribe({ email: sanitizedEmail });

        if (!error) {
            setEmail('');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex flex-col items-center bg-white dark:bg-gray-800 py-8 px-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                    Subscribe to my newsletter for a weekly summary of my blogs and updates.
                    Be the first to know about new posts and projects!
                </p>

                <div className="w-full max-w-md space-y-4">
                    <div className="relative">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email, I won't spam you :)"
                            required
                            className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 
                                rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                                dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full ${
                            loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600'
                        } text-white px-6 py-2 rounded-lg transition-colors duration-200`}
                    >
                        {loading ? 'Subscribing...' : 'Subscribe'}
                    </button>

                    {/* Success/Error Messages */}
                    {response?.success && (
                        <p className="text-green-500 text-center">{response.message}</p>
                    )}
                    {error && (
                        <p className="text-red-500 text-center">{error}</p>
                    )}
                </div>
            </div>
        </form>
    );
}