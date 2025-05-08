// src/lib/api/events.ts

/**
 * This file provides API client functions for events.
 * Note that for server components, direct DB access is preferred
 * but these functions are useful for client components or API routes.
 */

// Helper to get the base URL for API calls
const getBaseUrl = () => {
    // Use environment variable if available
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    
    // In browser context, use window.location
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    
    // Fallback for server context if environment variable not set
    return 'http://localhost:3000';
  };
  
  // Event types
  export interface Venue {
    id: string;
    name: string;
    address: string;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    notes?: string | null;
  }
  
  export interface StaffMember {
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }
  
  export interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    dob: string;
    status?: string | null;
    triageTag?: string | null;
    createdAt: string;
  }
  
  export interface Event {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    state: string;
    timezone: string;
    notes?: string | null;
    venue?: Venue | null;
    status?: string;
  }
  
  export interface EventWithDetails extends Event {
    staff?: StaffMember[];
    patients?: Patient[];
  }
  
  export interface EventWithRelations {
    event: Event;
    venue?: Venue | null;
    staffCount: number;
    patientCount: number;
  }
  
  export interface CreateEventInput {
    name: string;
    venueId?: string;
    startDate: string;
    endDate: string;
    state: string;
    timezone: string;
    notes?: string;
  }
  
  export interface UpdateEventInput {
    name?: string;
    venueId?: string;
    startDate?: string;
    endDate?: string;
    state?: string;
    timezone?: string;
    notes?: string;
  }
  
  /**
   * Get all events
   */
  export async function getEvents(): Promise<Event[]> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/events`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
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
   * Get a single event by ID
   */
  export async function getEvent(eventId: string): Promise<EventWithDetails | null> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/events/${eventId}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
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
   * Create a new event
   */
  export async function createEvent(data: CreateEventInput): Promise<Event | null> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/events`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
  export async function updateEvent(eventId: string, data: UpdateEventInput): Promise<Event | null> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/events/${eventId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
      const response = await fetch(`${getBaseUrl()}/api/events/${eventId}`, {
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
  
  /**
   * Get staff assigned to an event
   */
  export async function getEventStaff(eventId: string): Promise<StaffMember[]> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/events/${eventId}/staff`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch event staff: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching event staff:", error);
      return [];
    }
  }
  
  /**
   * Get patients for an event
   */
  export async function getEventPatients(eventId: string): Promise<Patient[]> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/events/${eventId}/patients`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch event patients: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching event patients:", error);
      return [];
    }
  }