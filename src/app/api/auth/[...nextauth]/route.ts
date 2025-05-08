// src/app/api/auth/[...nextauth]/route.ts
import { auth } from "@/lib/auth";

// Export handlers for GET and POST requests
export { auth as GET, auth as POST };