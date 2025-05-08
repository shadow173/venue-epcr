// src/app/(dashboard)/settings/page.tsx
import { Suspense } from "react";
import {  redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { 
  UserCircle,
  Mail,
  ShieldCheck,
  BadgeCheck,
  MapPin,
  Calendar
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/settings/profile-form";
import { AppearanceForm } from "@/components/settings/appearance-form";

// Get detailed user data
async function getUserProfile(userId: string) {
  try {
    const userData = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return userData.length ? userData[0] : null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

// User Profile component
async function UserProfileContent() {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  const user = await getUserProfile(session.user.id);
  
  if (!user) {
    return (
      <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Profile not found</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>Your user profile could not be loaded. Please contact an administrator.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-medium">{user.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                <p className="font-medium">{user.role}</p>
              </div>
            </div>
            
            {user.certificationEndDate && (
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                  <BadgeCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Certification End Date</p>
                  <p className="font-medium">{format(new Date(user.certificationEndDate), "PPP")}</p>
                </div>
              </div>
            )}
            
            {user.region && (
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Region</p>
                  <p className="font-medium">{user.region}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="font-medium">{format(new Date(user.createdAt), "PPP")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <ProfileForm user={user} />
        <AppearanceForm />
      </div>
    </div>
  );
}

// Skeleton loader for profile
function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect("/auth/signin");
  }
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-6">
          <Suspense fallback={<ProfileSkeleton />}>
            <UserProfileContent />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Password</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Change your password to keep your account secure.
                </p>
                <div className="mt-4 flex">
                  <Button>Change Password</Button>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Danger Zone</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Take caution with these actions, they cannot be undone.
                </p>
                <div className="mt-4 flex">
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 dark:text-gray-400">
                Notification preferences are not available in this version.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}