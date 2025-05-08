// src/lib/auth/password.ts
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  password: string, 
  hashedPassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}export async function userHasEventAccess(eventId: string): Promise<boolean> {
    try {
      const session = await getServerSession(authOptions);
      
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