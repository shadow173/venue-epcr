"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Define the form schema
const staffAssignmentSchema = z.object({
  userId: z.string().uuid({
    message: "Please select a user.",
  }),
  role: z.string().min(1, {
    message: "Please enter a role.",
  }),
});

// Define the types for the component props
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
  const [customRole, setCustomRole] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Common roles for quick selection
  const commonRoles = [
    "EMT",
    "Paramedic",
    "Nurse",
    "Physician",
    "Operations",

  ];
  
  // Form definition
  const form = useForm<z.infer<typeof staffAssignmentSchema>>({
    resolver: zodResolver(staffAssignmentSchema),
    defaultValues: {
      userId: "",
      role: "",
    },
  });
  
  // Form submission handler
  async function onSubmit(values: z.infer<typeof staffAssignmentSchema>) {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/events/${eventId}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign staff');
      }
      
      toast.success('Staff member assigned successfully!');
      router.push(`/events/${eventId}`);
      router.refresh();
    } catch (error) {
      console.error('Error assigning staff:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Handle role selection
  const handleRoleSelect = (value: string) => {
    if (value === "Other") {
      setCustomRole(true);
      form.setValue("role", "");
    } else {
      setCustomRole(false);
      form.setValue("role", value);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Staff Member</CardTitle>
        <CardDescription>
          Select a user and assign them a role for this event
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email}) - {user.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a user to assign to this event
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={handleRoleSelect}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {commonRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select a predefined role or choose "Other" to enter a custom role
                </FormDescription>
              </FormItem>
              
              {customRole && (
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Role</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter custom role"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/events/${eventId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Staff
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}