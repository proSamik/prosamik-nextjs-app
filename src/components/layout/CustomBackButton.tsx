import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/router';

interface CustomButtonProps {
  onClick?: () => void;
}

const CustomBackButton: React.FC<CustomButtonProps> = ({ onClick }) => {
  const [canGoBack, setCanGoBack] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkNavigationState = () => {
      // Use the history length to determine if the user can navigate back
      const hasHistory = window.history.length > 2; // More than 2 means there's a previous page
      const currentPath = window.location.pathname;
      const isRootPath = currentPath === '/' || currentPath === '';

      setCanGoBack(hasHistory && !isRootPath);
    };

    checkNavigationState();

    window.addEventListener('popstate', checkNavigationState); // Trigger on history changes

    return () => {
      window.removeEventListener('popstate', checkNavigationState);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else {
      router.back();
    }
  };

  if (!canGoBack) return null;

  return (
      <button
          onClick={handleClick}
          className="flex items-center mr-2 pr-2 py-2 rounded-md
        text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
      >
        <ChevronLeft className="w-7 h-7" />
        <span>Back</span>
      </button>
  );
};

export default CustomBackButton;
