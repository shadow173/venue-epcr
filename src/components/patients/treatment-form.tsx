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
import { toast, Toaster } from "sonner";

// Common treatment options
const COMMON_TREATMENTS = [
  "Oxygen Administration",
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
  treatmentType: z.string().min(1, "Treatment type is required"),
  name: z.string().min(1, "Treatment name is required"),
  notes: z.string().optional(),
  timestamp: z.coerce.date(),
});

type FormValues = z.infer<typeof formSchema>;

interface TreatmentFormProps {
  patientId: string;
  eventId: string;
  treatmentId?: string;
  initialData?: Partial<FormValues>;
}

export function TreatmentForm({ patientId, eventId, initialData }: TreatmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customTreatment, setCustomTreatment] = useState(initialData?.treatmentType === "Other");
  
  const defaultValues: FormValues = {
    treatmentType: initialData?.treatmentType || "",
    name: initialData?.name || "",
    notes: initialData?.notes || "",
    timestamp: initialData?.timestamp || new Date(),
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  // Watch for treatment type changes
  const treatmentType = form.watch("treatmentType");
  
  // Update customTreatment state when treatment type changes
  useState(() => {
    if (treatmentType === "Other") {
      setCustomTreatment(true);
    } else if (treatmentType && treatmentType !== "Other") {
      setCustomTreatment(false);
      form.setValue("name", treatmentType);
    }
  });
  
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      // Set name to treatment type if not custom
      if (values.treatmentType !== "Other") {
        values.name = values.treatmentType;
      }
      
      // Endpoint is always POST for new treatments
      const endpoint = `/api/patients/${patientId}/treatments`;
      
      // Submit the form
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          notes: values.notes,
          timestamp: values.timestamp
        }),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to record treatment`);
      }
      
      toast.success("Treatment recorded", {
        description: "Patient treatment has been successfully recorded."
      });
      
      // Redirect to patient detail page
      router.push(`/events/${eventId}/patients/${patientId}`);
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error", {
        description: "Failed to record treatment. Please try again."
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
              <FormField
                control={form.control}
                name="treatmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Treatment Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "Other") {
                          setCustomTreatment(true);
                          form.setValue("name", "");
                        } else {
                          setCustomTreatment(false);
                          form.setValue("name", value);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select treatment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_TREATMENTS.map((treatment) => (
                          <SelectItem key={treatment} value={treatment}>
                            {treatment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
      <Toaster />
    </Card>
  );
}