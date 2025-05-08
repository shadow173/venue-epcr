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
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Define form schema
const formSchema = z.object({
  narrative: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NarrativeFormProps {
  assessment: {
    id?: string;
    patientId: string;
    narrative?: string | null;
  };
  canEdit: boolean;
}

export function NarrativeForm({ assessment, canEdit }: NarrativeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      narrative: assessment.narrative || "",
    },
  });
  
  async function onSubmit(values: FormValues) {
    if (!canEdit) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/patients/${assessment.patientId}/assessment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          narrative: values.narrative,
        }),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to update narrative");
      }
      
      toast.success("Narrative updated", {
        description: "Patient narrative has been saved successfully."
      });
      
      router.refresh();
    } catch (error) {
      console.error("Error updating narrative:", error);
      toast.error("Error", {
        description: "Failed to update narrative. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Narrative</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="narrative"
              render={({ field }) => (
                <FormItem>
                  <FormDescription>
                    Document the events of the call, your assessment findings, and your treatment. 
                    Include pertinent positive and negative findings, and any changes in the patient&#39;s condition.
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="Enter detailed narrative"
                      className="min-h-[300px]"
                      disabled={!canEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          
          {canEdit && (
            <CardFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="ml-auto"
              >
                {isSubmitting ? "Saving..." : "Save Narrative"}
              </Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}