// src/app/(dashboard)/venues/[venueId]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { venues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { VenueForm } from "@/components/forms/venue-form";

// Fetch venue data
async function getVenue(venueId: string) {
  try {
    const venueData = await db.select({
      id: venues.id,
      name: venues.name,
      address: venues.address,
      city: venues.city,
      state: venues.state,
      zipCode: venues.zipCode,
      notes: venues.notes,
    })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);
    
    return venueData.length ? venueData[0] : null;
  } catch (error) {
    console.error("Error fetching venue:", error);
    return null;
  }
}

export default async function EditVenuePage(
  props: {
    params: Promise<{ venueId: string }>
  }
) {
  const params = await props.params;
  const session = await getServerSession();

  // Ensure user is authenticated
  if (!session) {
    redirect("/auth/signin");
  }

  // Only admins can edit venues
  if (session.user.role !== "ADMIN") {
    redirect("/venues");
  }

  const venue = await getVenue(params.venueId);

  if (!venue) {
    notFound();
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href={`/venues/${params.venueId}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to venue</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit Venue</h1>
      </div>
      
      <div className="grid gap-6">
        <VenueForm
          venueId={params.venueId}
          initialData={{
            ...venue,
            city: venue.city ?? undefined,
            state: venue.state ?? undefined,
            zipCode: venue.zipCode ?? undefined,
            notes: venue.notes ?? undefined
          }}
        />
      </div>
    </div>
  );
}