"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { User } from "lucide-react";

// Define staff roles
const STAFF_ROLES = [
  "EMT",
  "Lead EMT",
  "Supervisor",
  "Paramedic",
  "Medical Director",
  "Logistics",
  "Admin"
];

// Define form schema
const formSchema = z.object({
  userId: z.string().uuid("Please select a staff member"),
  role: z.string().min(1, "Please select a role"),
});

type FormValues = z.infer<typeof formSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface StaffAssignmentFormProps {
  eventId: string;
  users: User[];
}

export function StaffAssignmentForm({ eventId, users }: StaffAssignmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      role: "",
    },
  });
  
  async function onSubmit(values: FormValues) {
    if (users.length === 0) {
      toast({
        title: "Error",
        description: "No available staff to assign.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/events/${eventId}/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to assign staff");
      }
      
      toast({
        title: "Staff assigned",
        description: "The staff member has been successfully assigned to this event.",
      });
      
      router.push(`/events/${eventId}`);
      router.refresh();
    } catch (error) {
      console.error("Error assigning staff:", error);
      toast({
        title: "Error",
        description: "Failed to assign staff. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assign Staff</CardTitle>
          <CardDescription>
            Add staff members to this event.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
            <User className="h-8 w-8 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No available staff</h3>
          <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
            All available staff members have already been assigned to this event.
          </p>
          <Button asChild className="mt-4">
            <a href="/events">Go Back to Events</a>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Staff</CardTitle>
        <CardDescription>
          Add staff members to this event.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STAFF_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              type="button"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Assigning..." : "Assign Staff"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}