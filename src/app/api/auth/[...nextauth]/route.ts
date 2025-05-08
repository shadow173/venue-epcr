// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth/next"; // Note the /next path 
import { authOptions } from "@/lib/auth";

// Create and export the auth handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };