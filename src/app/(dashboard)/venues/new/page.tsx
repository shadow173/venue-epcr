// src/app/(dashboard)/venues/new/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { VenueForm } from "@/components/forms/venue-form";

export default async function NewVenuePage() {
  const session = await getServerSession();
  
  // Ensure user is authenticated
  if (!session) {
    redirect("/auth/signin");
  }
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/venues">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to venues</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create New Venue</h1>
      </div>
      
      <div className="grid gap-6">
        <VenueForm />
      </div>
    </div>
  );
}