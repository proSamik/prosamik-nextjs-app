import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Restrict state to specific string values

  useEffect(() => {
    // Only check for saved theme preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

    // If there's a saved theme, use it; otherwise, default to light
    const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (selectedTheme: 'light' | 'dark') => {
    if (selectedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', selectedTheme);

    // Dispatch custom event for theme change
    window.dispatchEvent(
        new CustomEvent('themeChange', {
          detail: { theme: selectedTheme },
        })
    );
  };

  const toggleTheme = () => {
    const newTheme: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
      <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
            <Moon className="h-5 w-5 text-gray-800" />
        ) : (
            <Sun className="h-5 w-5 text-yellow-500" />
        )}
      </button>
  );
};

export default ThemeToggle;
