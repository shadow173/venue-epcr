// src/lib/auth/index.ts
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import EmailProvider from "next-auth/providers/email";
import { db } from '@/db';


// Define the structure of your users table
interface CustomAdapterUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: 'EMT' | 'ADMIN';
}

// Define a proper type for the DrizzleAdapter
type AuthJsAdapter = ReturnType<typeof DrizzleAdapter>;

// Extend the Session interface
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: 'EMT' | 'ADMIN';
    }
  }
}

export const { auth, signIn, signOut } = NextAuth({
  // Use a more specific type cast
  adapter: DrizzleAdapter(db) as AuthJsAdapter,
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST!,
        port: Number(process.env.EMAIL_SERVER_PORT!),
        auth: {
          user: process.env.EMAIL_SERVER_USER!,
          pass: process.env.EMAIL_SERVER_PASSWORD!,
        },
      },
      from: process.env.EMAIL_FROM!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // Use a more specific type cast
        const customUser = user as unknown as CustomAdapterUser;
        
        session.user.id = user.id;
        session.user.role = customUser.role || 'EMT'; // Default to 'EMT' if role is undefined
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
});

// Type for authenticated user
export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: 'EMT' | 'ADMIN';
};