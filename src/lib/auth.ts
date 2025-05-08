// src/lib/auth.ts
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import type { NextAuthOptions, SessionStrategy } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from '@/db';
import { users, staffAssignments } from '@/db/schema';
import { eq, and } from "drizzle-orm";
import { verifyPassword } from '@/lib/auth/password';

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

// Define the auth options here instead of in the route file
export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const userResult = await db.select()
            .from(users)
            .where(eq(users.email, credentials.email.toLowerCase()))
            .limit(1);

          if (!userResult.length) {
            return null;
          }

          const user = userResult[0];
          if (!user.password) {
            return null;
          }

          const isValid = await verifyPassword(credentials.password, user.password);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("Error in authorize:", error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || 'EMT';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as 'EMT' | 'ADMIN';
      }
      return session;
    }
  },
  session: {
    strategy: "jwt" as SessionStrategy,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

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

// Rest of your helper functions remain the same
export async function userHasEventAccess(eventId: string): Promise<boolean> {
  // Your existing implementation
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

export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session;
}

export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user?.role && session.user.role === "ADMIN";
}