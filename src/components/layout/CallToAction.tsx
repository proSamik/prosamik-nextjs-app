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
            <div
                className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 shadow-blue-200 dark:shadow-blue-200 dark:shadow-sm shadow-lg rounded-lg hover:shadow-xl transition-all duration-200">
                <h2 className="text-2xl font-bold mb-4 text-amber-500">Subscribe to my newsletter</h2>
                <p className="mb-6 text-center text-amber-400 dark:text-amber-200">
                    If and only if I find something worth sharing,<br/>
                    You will be the first to know!
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
                                dark:bg-gray-900 dark:text-white dark:placeholder-gray-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full ${
                            loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-amber-500 hover:bg-amber-600'
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