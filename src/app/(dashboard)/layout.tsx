import React from "react";
import { Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  
  // Check if user is authenticated
  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopNav user={session.user} />
      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar />
        <main className="flex-1 p-6 md:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}