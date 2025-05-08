// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import type { NextAuthOptions, SessionStrategy } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/password';

// Define the complete auth options directly in this file
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

// Create and export the auth handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };