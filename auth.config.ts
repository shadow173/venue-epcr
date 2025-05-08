// auth.config.ts
import type { NextAuthOptions } from "next-auth";

export const authConfig: NextAuthOptions = {
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || 'EMT';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        
        // Add role from token to session
        if (token.role) {
          session.user.role = token.role as 'EMT' | 'ADMIN';
        }
      }
      return session;
    }
  },
  providers: [], // We'll add these in auth.ts
};