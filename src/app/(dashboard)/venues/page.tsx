// src/app/(dashboard)/venues/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { venues } from "@/db/schema";
import { desc } from "drizzle-orm";
import { 
  MapPin, 
  PlusCircle, 
  Search 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

// Get venues
async function getVenues() {
  try {
    return await db.select({
      id: venues.id,
      name: venues.name,
      address: venues.address,
      city: venues.city,
      state: venues.state,
      zipCode: venues.zipCode,
      notes: venues.notes,
      createdAt: venues.createdAt,
    })
    .from(venues)
    .orderBy(desc(venues.createdAt));
  } catch (error) {
    console.error("Error fetching venues:", error);
    return [];
  }
}

// Venues List component
async function VenuesListContent() {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  const allVenues = await getVenues();
  
  if (allVenues.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          <MapPin className="h-6 w-6 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium">No venues found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by adding your first venue.
        </p>
        <Button asChild className="mt-6">
          <Link href="/venues/new">Add New Venue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {allVenues.map((venue) => (
        <Card key={venue.id} className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">{venue.name}</CardTitle>
            {venue.city && venue.state && (
              <CardDescription className="mt-1">
                {venue.city}, {venue.state}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-start">
              <MapPin className="mr-2 mt-0.5 h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm">{venue.address}</p>
                {venue.zipCode && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {venue.zipCode}
                  </p>
                )}
              </div>
            </div>
            
            {venue.notes && (
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p className="line-clamp-2">{venue.notes}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-gray-50 dark:bg-gray-800/50">
            <div className="flex w-full justify-between">
              <Link href={`/venues/${venue.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400">
                View Details
              </Link>
              
              <Link href={`/venues/${venue.id}/edit`} className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Edit
              </Link>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// Skeleton loader for venues
function VenuesListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </CardHeader>
          <CardContent className="pb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </CardContent>
          <CardFooter className="bg-gray-50 dark:bg-gray-800/50">
            <Skeleton className="h-4 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export default async function VenuesPage() {
  
  return (
    <div className="animate-fadeIn space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Venues</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            View and manage venues
          </p>
        </div>
        
        <div className="mt-4 flex md:mt-0">
          <Button asChild>
            <Link href="/venues/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Venue
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="rounded-lg border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search venues..." 
            className="pl-8 bg-background w-full md:w-96"
          />
        </div>
      </div>

      <Suspense fallback={<VenuesListSkeleton />}>
        <VenuesListContent />
      </Suspense>
    </div>
  );
}