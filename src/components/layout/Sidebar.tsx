// src/components/layout/Sidebar.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  Users, 
  ClipboardList, 
  Settings, 
  Menu, 
  X, 
  LogOut 
} from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Patients', href: '/patients', icon: Users },
    { name: 'Reports', href: '/reports', icon: ClipboardList },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile menu button */}
      <button 
        onClick={toggleSidebar} 
        className="fixed left-4 top-4 z-40 rounded-md bg-blue-600 p-2 text-white md:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white transition-transform duration-300 ease-in-out dark:bg-gray-800 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex h-16 items-center justify-between px-4 md:h-20">
            <div className="flex items-center">
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">EMS EPCR</span>
            </div>
            <button onClick={toggleSidebar} className="md:hidden">
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-2 py-2 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <button className="group flex w-full items-center rounded-md px-2 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
              <LogOut className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}