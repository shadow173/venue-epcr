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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";

// Define form schema with Zod
const formSchema = z.object({
  name: z.string().min(1, "Venue name is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// List of US states
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC"
];

interface VenueFormProps {
  venueId?: string;
  initialData?: Partial<FormValues>;
}

export function VenueForm({ venueId, initialData }: VenueFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultValues: Partial<FormValues> = {
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
    ...initialData,
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      // Determine API endpoint and method
      const endpoint = venueId 
        ? `/api/venues/${venueId}` 
        : `/api/venues`;
      
      const method = venueId ? "PATCH" : "POST";
      
      // Submit the form
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${venueId ? "update" : "create"} venue`);
      }
      
      const data = await response.json();
      
      toast.success(venueId ? "Venue updated" : "Venue created", {
        description: `Venue has been successfully ${venueId ? "updated" : "created"}.`
      });
      
      // Redirect to venue detail page
      router.push(`/venues/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error", {
        description: `Failed to ${venueId ? "update" : "create"} venue. Please try again.`
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{venueId ? "Edit" : "New"} Venue</CardTitle>
        <CardDescription>
          {venueId ? "Update" : "Add"} venue information for events.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter venue name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter street address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
  <SelectItem value="none">None</SelectItem>
  {US_STATES.map((state) => (
    <SelectItem key={state} value={state}>
      {state}
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
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ZIP code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter venue notes or special instructions"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Additional information about the venue, such as parking instructions, 
                    access details, or other relevant information.
                  </FormDescription>
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
              {isSubmitting ? "Saving..." : venueId ? "Update Venue" : "Create Venue"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}