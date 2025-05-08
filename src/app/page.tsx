// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the user is not authenticated, redirect to login
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    // If the user is authenticated, fetch events
    if (status === "authenticated") {
      fetchEvents();
    }
  }, [status, router]);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading...</p>
      </div>
    );
  }

  // If authenticated, show the dashboard
  if (status === "authenticated") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Venue Vitality Dashboard
              </h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Signed in as {session?.user?.name || session?.user?.email}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <div className="bg-blue-600 text-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
              <div className="flex flex-col space-y-2">
                <Link 
                  href="/events/new" 
                  className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-50 transition"
                >
                  Create New Event
                </Link>
                <Link 
                  href="/patients" 
                  className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-50 transition"
                >
                  View All Patients
                </Link>
                {session?.user?.role === "ADMIN" && (
                  <Link 
                    href="/admin/reports" 
                    className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-50 transition"
                  >
                    Generate Reports
                  </Link>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md col-span-1 md:col-span-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Event Status Summary
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-100 dark:bg-green-900 p-4 rounded-md">
                  <p className="text-green-800 dark:text-green-100 text-sm font-medium">Active</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-50">
                    {events.filter(e => new Date(e.endDate) >= new Date()).length || 0}
                  </p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-md">
                  <p className="text-yellow-800 dark:text-yellow-100 text-sm font-medium">Upcoming</p>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-50">
                    {events.filter(e => new Date(e.startDate) > new Date()).length || 0}
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
                  <p className="text-gray-800 dark:text-gray-100 text-sm font-medium">Past</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                    {events.filter(e => new Date(e.endDate) < new Date()).length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Upcoming Events
              </h2>
            </div>
            {events.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {events
                  .filter(event => new Date(event.startDate) >= new Date())
                  .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                  .slice(0, 5)
                  .map(event => (
                    <div key={event.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <Link href={`/events/${event.id}`} className="block">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {event.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {event.venue?.name || "No venue assigned"}
                            </p>
                          </div>
                          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {event.state}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No upcoming events found. Create a new event to get started.
                </p>
                <Link 
                  href="/events/new" 
                  className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-700 transition"
                >
                  Create New Event
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // This will typically not be shown due to the redirect in the useEffect,
  // but it's good to have a fallback
  return null;
}