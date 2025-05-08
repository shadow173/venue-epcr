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
import { toast } from "@/components/ui/use-toast";

// Common treatment options
const COMMON_TREATMENTS = [
  "Oxygen Administration",
  "IV Access",
  "IV Fluids",
  "Medication Administration",
  "Wound Care",
  "Bandaging",
  "Splinting",
  "CPR",
  "Defibrillation",
  "Manual Stabilization",
  "Airway Management",
  "Other"
];

// Define form schema with Zod
const formSchema = z.object({
  name: z.string().min(1, "Treatment name is required"),
  notes: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
});

type FormValues = z.infer<typeof formSchema>;

interface TreatmentFormProps {
  patientId: string;
  eventId: string;
  treatmentId?: string;
  initialData?: Partial<FormValues>;
}

export function TreatmentForm({ patientId, eventId, treatmentId, initialData }: TreatmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customTreatment, setCustomTreatment] = useState(false);
  
  const defaultValues: Partial<FormValues> = {
    name: "",
    notes: "",
    timestamp: new Date(),
    ...initialData,
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  // Handle treatment selection
  const handleTreatmentSelect = (value: string) => {
    if (value === "Other") {
      setCustomTreatment(true);
      form.setValue("name", "");
    } else {
      setCustomTreatment(false);
      form.setValue("name", value);
    }
  };
  
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      // Endpoint is always POST for new treatments
      const endpoint = `/api/patients/${patientId}/treatments`;
      
      // Submit the form
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to record treatment`);
      }
      
      toast({
        title: "Treatment recorded",
        description: "Patient treatment has been successfully recorded.",
      });
      
      // Redirect to patient detail page
      router.push(`/events/${eventId}/patients/${patientId}`);
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to record treatment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Treatment</CardTitle>
        <CardDescription>
          Record patient treatment information.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <FormLabel>Treatment Type</FormLabel>
                <Select onValueChange={handleTreatmentSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select treatment" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TREATMENTS.map((treatment) => (
                      <SelectItem key={treatment} value={treatment}>
                        {treatment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {customTreatment && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Treatment</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter treatment name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add details about the treatment (e.g., dosage, method, response)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include relevant details such as medication dosages, method of administration, 
                    patient response, or any complications.
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
              disabled={isSubmitting || (customTreatment && !form.getValues().name)}
            >
              {isSubmitting ? "Saving..." : "Record Treatment"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}