import { useState } from 'react';
import { useSubmitFeedback } from '@/hooks/useSubmitFeedback';

export default function FeedbackForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const { response, error, loading, submitFeedback } = useSubmitFeedback();

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleInputSanitization = (input: string) => {
        return input.replace(/['"\\;%]/g, '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const sanitizedName = handleInputSanitization(name.trim());
        const sanitizedEmail = handleInputSanitization(email.trim());
        const sanitizedMessage = handleInputSanitization(message.trim());

        if (sanitizedName.length === 0) {
            alert('Name cannot be empty.');
            return;
        }

        if (!validateEmail(sanitizedEmail)) {
            alert('Please enter a valid email address.');
            return;
        }

        if (sanitizedMessage.length === 0) {
            alert('Message cannot be empty.');
            return;
        }

        await submitFeedback({ name: sanitizedName, email: sanitizedEmail, message: sanitizedMessage });

        if (!error) {
            setName('');
            setEmail('');
            setMessage('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
            <p className="text-gray-600 dark:text-gray-300">
                Your roast/criticism/feedback is always welcome. I am taking your email not to spam but to notify you when I implement your suggestions!
            </p>
            <div>
                <label htmlFor="name" className="block font-medium">
                    Name:
                </label>
                <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your good name"
                    className="block w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
            </div>
            <div>
                <label htmlFor="email" className="block font-medium">
                    Email:
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="I won't spam you"
                    className="block w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
            </div>
            <div>
                <label htmlFor="message" className="block font-medium">
                    Feedback:
                </label>
                <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder="I won't curse you"
                    className="block w-full p-2 h-32 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 break-words"
                    style={{ resize: 'vertical' }}
                ></textarea>
            </div>
            <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded w-full ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            >
                {loading ? 'Submitting...' : 'Submit'}
            </button>
            {response?.success && <p className="text-green-500">{response.message}</p>}
            {error && <p className="text-red-500">{error}</p>}
        </form>
    );
}
