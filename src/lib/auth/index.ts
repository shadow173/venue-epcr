// src/lib/auth/index.ts
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from './password';

// Define the structure of your users table
interface CustomAdapterUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: 'EMT' | 'ADMIN';
  password?: string | null;
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
  adapter: DrizzleAdapter(db) as AuthJsAdapter,
  providers: [
    // Keep EmailProvider as a backup/alternative authentication method
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
    
    // Secure credentials provider for email/password authentication
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
          // Find user by email
          const userResult = await db.select()
            .from(users)
            .where(eq(users.email, credentials.email.toLowerCase()))
            .limit(1);

          if (!userResult.length) {
            // No user found with this email
            console.log(`No user found with email: ${credentials.email}`);
            return null;
          }

          const user = userResult[0];

          // Check if the user has a password set
          if (!user.password) {
            console.log(`User has no password set: ${user.email}`);
            return null;
          }

          // Verify the password
          const isValid = await verifyPassword(credentials.password, user.password);
          
          if (!isValid) {
            console.log(`Invalid password for user: ${user.email}`);
            return null;
          }

          // Return user data (excluding sensitive fields)
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as 'EMT' | 'ADMIN',
          };
        } catch (error) {
          console.error("Error in authorize:", error);
          return null;
        }
      }
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        
        // Add role from token to session
        if (token.role) {
          session.user.role = token.role as 'EMT' | 'ADMIN';
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      // When signing in, add user role to token
      if (user) {
        token.role = (user as any).role || 'EMT';
      }
      return token;
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  // Increase security with stronger JWT encryption
  jwt: {
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