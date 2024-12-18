const Loading = () => (
    <div className="max-w-[728px] mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
        </div>
        <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
    </div>
);

export default Loading;
