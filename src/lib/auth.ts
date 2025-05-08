// src/lib/auth.ts
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/db";
import { staffAssignments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

// Server-side session function
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
 * This is a server-side function for use in server components
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
    const assignments = await db.select()
      .from(staffAssignments)
      .where(
        and(
          eq(staffAssignments.userId, session.user.id),
          eq(staffAssignments.eventId, eventId)
        )
      )
      .limit(1);
    
    return assignments.length > 0;
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