// src/app/(dashboard)/users/[userId]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UserForm } from "@/components/users/user-form";

// Get user data
async function getUser(userId: string) {
  try {
    const userData = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      certificationEndDate: users.certificationEndDate,
      region: users.region,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
    return userData.length ? userData[0] : null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export default async function EditUserPage(
  props: {
    params: Promise<{ userId: string }>
  }
) {
  const params = await props.params;
  // Get the current session
  const session = await getServerSession();

  // Only admins can edit users (or users can edit themselves)
  if (!session) {
    redirect("/auth/signin");
  }

  // Extract userId from params
  const { userId } = params;

  // Check if user is authorized to edit this user
  const isAdmin = session.user.role === "ADMIN";
  const isSelf = session.user.id === userId;

  if (!isAdmin && !isSelf) {
    redirect("/");
  }

  // Fetch user data
  const user = await getUser(userId);

  if (!user) {
    notFound();
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href={isAdmin ? "/users" : "/settings"}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit User</h1>
      </div>
      
      <div className="grid gap-6">
        <UserForm userId={userId} initialData={user} />
      </div>
    </div>
  );
}