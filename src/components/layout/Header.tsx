// src/components/layout/Header.tsx
"use client";

import { useState, useEffect } from 'react';
import { Bell, Sun, Moon, User, Search } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [userUnit, setUserUnit] = useState('');

  useEffect(() => {
    setMounted(true);
    // Fetch user unit from API
    const fetchUserUnit = async () => {
      try {
        // Placeholder for actual API call
        setUserUnit('Unit 42'); 
      } catch (error) {
        console.error('Error fetching user unit:', error);
      }
    };
    
    fetchUserUnit();
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) return null;

  return (
    <header className="z-10 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative rounded-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border-gray-300 bg-gray-100 pl-10 text-sm placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
              placeholder="Search..."
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {userUnit && (
            <div className="hidden rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200 md:block">
              {userUnit}
            </div>
          )}
          
          <button className="rounded-full p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
            <Bell className="h-5 w-5" />
          </button>
          
          <button 
            onClick={toggleTheme}
            className="rounded-full p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          <button className="rounded-full p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}