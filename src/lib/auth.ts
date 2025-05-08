// src/lib/auth.ts
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: 'EMT' | 'ADMIN';
    }
  }
  
  interface User {
    role?: string;
  }
}

// Server-side session function - simplified version
export async function getServerSession() {
  return await nextAuthGetServerSession(authOptions);
}

// Type for authenticated user
export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: 'EMT' | 'ADMIN';
};

/**
 * Check if the current user has access to an event
 */
export async function userHasEventAccess(eventId: string): Promise<boolean> {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return false;
    }
    
    // Admin users have access to all events
    if (session.user.role === "ADMIN") {
      return true;
    }
    
    // For non-admin users, check if they're assigned to the event
    const response = await fetch(`/api/events/${eventId}/access`, {
      credentials: 'include',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return false;
    }
    
    const { hasAccess } = await response.json();
    return hasAccess;
  } catch (error) {
    console.error("Error checking event access:", error);
    return false;
  }
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user?.role && session.user.role === "ADMIN";
}