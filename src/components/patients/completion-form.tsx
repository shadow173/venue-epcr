"use client";

import { useState, useRef } from "react";
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
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";

// Define the form schema
const formSchema = z.object({
  disposition: z.enum(["transported", "rma", "eloped"]).optional(),
  hospitalName: z.string().optional(),
  emsUnit: z.string().optional(),
  patientSignature: z.string().optional(),
  emtSignature: z.string().optional(),
  status: z.enum(["incomplete", "complete"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CompletionFormProps {
  assessment: {
    id?: string;
    patientId: string;
    disposition?: string | null;
    hospitalName?: string | null;
    emsUnit?: string | null;
    patientSignature?: string | null;
    patientSignatureTimestamp?: Date | null;
    emtSignature?: string | null;
    emtSignatureTimestamp?: Date | null;
    status?: string | null;
  };
  canEdit: boolean;
  isAdmin: boolean;
}

const dispositionText: Record<string, string> = {
  transported: "Patient was transported to a medical facility by ambulance.",
  rma: "Patient refused medical assistance against medical advice.",
  eloped: "Patient left the scene without signing or giving consent.",
};

export function CompletionForm({ assessment, canEdit, isAdmin }: CompletionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const patientSignaturePadRef = useRef<HTMLDivElement>(null);
  const emtSignaturePadRef = useRef<HTMLDivElement>(null);
  
  const isComplete = assessment.status === "complete";
  
  // Ensure we have valid enum values for the form
  const getValidDisposition = () => {
    if (assessment.disposition && ["transported", "rma", "eloped"].includes(assessment.disposition)) {
      return assessment.disposition as "transported" | "rma" | "eloped";
    }
    return undefined;
  };

  const getValidStatus = () => {
    if (assessment.status && ["incomplete", "complete"].includes(assessment.status)) {
      return assessment.status as "incomplete" | "complete";
    }
    return "incomplete" as const;
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      disposition: getValidDisposition(),
      hospitalName: assessment.hospitalName || "",
      emsUnit: assessment.emsUnit || "",
      patientSignature: assessment.patientSignature || "",
      emtSignature: assessment.emtSignature || "",
      status: getValidStatus(),
    },
  });
  
  const watchDisposition = form.watch("disposition");
  
  // Signature pad handler - simplified for example
  const getSignature = () => {
    // In a real app, use a proper signature pad library
    // Here just returning timestamp as "signature" for demo
    return new Date().toISOString();
  };
  
  const handlePatientSign = () => {
    const signature = getSignature();
    form.setValue("patientSignature", signature);
  };
  
  const handleEmtSign = () => {
    const signature = getSignature();
    form.setValue("emtSignature", signature);
  };
  
  async function onSubmit(values: FormValues) {
    if (!canEdit) return;
    
    // Validate that required fields are filled based on disposition
    if (values.disposition === "transported" && !values.hospitalName) {
      form.setError("hospitalName", {
        type: "manual",
        message: "Hospital name is required for transported patients",
      });
      return;
    }
    
    if (values.disposition === "transported" && !values.emsUnit) {
      form.setError("emsUnit", {
        type: "manual",
        message: "EMS unit identifier is required for transported patients",
      });
      return;
    }
    
    if (values.disposition === "rma" && !values.patientSignature) {
      toast.error("Patient signature required", {
        description: "Patient must sign for a refusal of medical assistance (RMA)."
      });
      return;
    }
    
    // For complete status, EMT signature is required
    if (values.status === "complete" && !values.emtSignature) {
      toast.error("EMT signature required", {
        description: "EMT must sign to complete the report."
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/patients/${assessment.patientId}/assessment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to update completion status");
      }
      
      toast.success(values.status === "complete" ? "Report completed" : "Information saved", {
        description: values.status === "complete" 
          ? "The patient report has been marked as complete." 
          : "Disposition information has been saved successfully."
      });
      
      router.refresh();
    } catch (error) {
      console.error("Error updating completion status:", error);
      toast.error("Error", {
        description: "Failed to update completion status. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Patient Record</CardTitle>
        <CardDescription>
          Finalize the patient record with disposition and signatures.
        </CardDescription>
      </CardHeader>
      
      {isComplete && !isAdmin && (
        <div className="mx-6 mb-4 rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400 dark:text-yellow-300" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Completed Record</h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  This patient record has been marked as complete and cannot be edited. 
                  Contact an administrator if changes are needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="disposition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Disposition</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!canEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select disposition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="transported">Transported to ED</SelectItem>
                      <SelectItem value="rma">RMA - Refused Medical Assistance</SelectItem>
                      <SelectItem value="eloped">Eloped - Patient Left Scene</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {field.value ? dispositionText[field.value] : "Select the outcome of this patient encounter."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchDisposition === "transported" && (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="hospitalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hospital Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter hospital name" 
                          {...field} 
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emsUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EMS Unit Identifier</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter EMS unit number" 
                          {...field} 
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {watchDisposition === "rma" && (
              <div className="space-y-4">
                <div>
                  <FormLabel>Patient Signature</FormLabel>
                  <div 
                    ref={patientSignaturePadRef}
                    className="mt-1 h-32 border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                  >
                    {assessment.patientSignature ? (
                      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                        <p className="text-sm font-medium">Signature captured</p>
                        {assessment.patientSignatureTimestamp && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Signed at {format(new Date(assessment.patientSignatureTimestamp), "PPpp")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Patient signature area
                        </p>
                        {canEdit && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={handlePatientSign}
                          >
                            Capture Signature
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <FormDescription>
                    Patient acknowledges refusal of medical assistance against medical advice.
                  </FormDescription>
                </div>
                
                <div className="rounded-md bg-gray-50 p-4 text-sm dark:bg-gray-800">
                  <p className="font-semibold">Refusal of Medical Assistance Notice</p>
                  <p className="mt-2">
                    I hereby refuse medical assistance against the advice of the EMT. I understand 
                    the risks associated with refusing care and transport to a medical facility, 
                    which have been explained to me.
                  </p>
                  <p className="mt-2">
                    I release the EMT, the EMS agency, and all associated personnel from all liability 
                    related to this refusal.
                  </p>
                </div>
              </div>
            )}
            
            <div>
              <FormLabel>EMT Signature</FormLabel>
              <div 
                ref={emtSignaturePadRef}
                className="mt-1 h-32 border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
              >
                {assessment.emtSignature ? (
                  <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                    <p className="text-sm font-medium">Signature captured</p>
                    {assessment.emtSignatureTimestamp && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Signed at {format(new Date(assessment.emtSignatureTimestamp), "PPpp")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      EMT signature area
                    </p>
                    {canEdit && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleEmtSign}
                      >
                        Capture Signature
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <FormDescription>
                EMT signature confirming accuracy of report.
              </FormDescription>
            </div>
            
            {canEdit && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <FormLabel className="text-base font-semibold">Mark as Complete</FormLabel>
                        <FormDescription>
                          Once marked complete, this record cannot be edited except by an administrator.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="incomplete">In Progress</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          
          {canEdit && (
            <CardFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="ml-auto"
              >
                {isSubmitting ? "Saving..." : "Save Completion Info"}
              </Button>
            </CardFooter>
          )}
        </form>
      </Form>
      <Toaster />
    </Card>
  );
}