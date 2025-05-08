// src/lib/api/events.ts

// Define types for our event data
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  status?: string;
  // Add other patient fields as needed
}

export interface StaffMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  role: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  expectedAttendees?: number | null;
  venue?: Venue | null;
  staff?: StaffMember[];
  patients?: Patient[];
  canEdit: boolean;
}

// Helper to get the base URL for API calls
const getBaseUrl = () => {
  // Use environment variable if available
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // In browser context, use window.location
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  // Fallback for server context if environment variable not set
  return '';
};

/**
 * Get an event by ID
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/events/${eventId}`, {
      credentials: 'include',
      cache: 'no-store' // Prevents caching
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch event: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

/**
 * Get all events
 */
export async function getEvents(): Promise<Event[]> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/events`, {
      credentials: 'include',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

/**
 * Create a new event
 */
export async function createEvent(eventData: Omit<Event, 'id'>): Promise<Event | null> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error creating event:", error);
    return null;
  }
}

/**
 * Update an existing event
 */
export async function updateEvent(eventId: string, eventData: Partial<Event>): Promise<Event | null> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error updating event:", error);
    return null;
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string): Promise<boolean> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/events/${eventId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete event: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting event:", error);
    return false;
  }
}