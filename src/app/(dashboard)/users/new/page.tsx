// src/app/(dashboard)/users/new/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UserForm } from "@/components/users/user-form";

export default async function NewUserPage() {
  // Get the current session
  const session = await getServerSession();
  
  // Only admins can create users
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to users</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Add New User</h1>
      </div>
      
      <div className="grid gap-6">
        <UserForm />
      </div>
    </div>
  );
}