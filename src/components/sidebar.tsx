"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Calendar,
  FileText,
  Home,
  LayoutDashboard,
  MapPin,
  Users,
  Settings,
  BarChart,
} from "lucide-react";
import { useSession } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Venues", href: "/venues", icon: MapPin },
  { name: "Patients", href: "/patients", icon: FileText },
  { name: "Staff", href: "/staff", icon: Users },
  { name: "Reports", href: "/reports", icon: BarChart },
];

const adminNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-6 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="rounded-md bg-blue-600 p-1 dark:bg-blue-500">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">EMS EPCR</span>
        </Link>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto pt-5">
        <nav className="flex-1 space-y-1 px-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 shrink-0",
                    isActive 
                      ? "text-blue-600 dark:text-blue-400" 
                      : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
          
          {isAdmin && (
            <>
              <div className="my-4">
                <div className="mx-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Admin
                  </p>
                </div>
              </div>
              
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center rounded-md px-3 py-2 text-sm font-medium",
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5 shrink-0",
                        isActive 
                          ? "text-blue-600 dark:text-blue-400" 
                          : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </div>
    </div>
  );
}