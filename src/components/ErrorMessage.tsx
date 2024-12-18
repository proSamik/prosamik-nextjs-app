interface ErrorMessageProps {
    message: string;
}

const ErrorMessage = ({ message }: ErrorMessageProps) => {
    return (
        <div className="max-w-[728px] mx-auto px-4 py-8">
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700">
                            {message}
                        </p>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="text-sm bg-white p-4 rounded border border-red-200">
                        <p className="font-medium text-red-800">Troubleshooting steps:</p>
                        <ul className="mt-2 list-disc list-inside text-red-700">
                            <li>Ensure the backend server is running</li>
                            <li>Check if the server is running on port 8080</li>
                            <li>Verify your network connection</li>
                            <li>Try refreshing the page</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ErrorMessage;
