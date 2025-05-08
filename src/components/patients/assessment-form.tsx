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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast, Toaster } from "sonner";

// Define form schema
const formSchema = z.object({
  chiefComplaint: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AssessmentFormProps {
  assessment: {
    id?: string;
    patientId: string;
    chiefComplaint?: string | null;
  };
  canEdit: boolean;
}

export function AssessmentForm({ assessment, canEdit }: AssessmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chiefComplaint: assessment.chiefComplaint || "",
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
          chiefComplaint: values.chiefComplaint,
        }),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to update assessment");
      }
      
      toast.success("Assessment updated", {
        description: "Chief complaint has been saved successfully."
      });
      
      router.refresh();
    } catch (error) {
      console.error("Error updating assessment:", error);
      toast.error("Error", {
        description: "Failed to update assessment. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="chiefComplaint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Chief Complaint</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the patient's chief complaint"
                      className="min-h-[100px]"
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
                {isSubmitting ? "Saving..." : "Save Chief Complaint"}
              </Button>
            </CardFooter>
          )}
        </form>
      </Form>
      <Toaster />
    </Card>
  );
}