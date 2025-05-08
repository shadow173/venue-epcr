"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Upload } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Define form schema - make all fields explicitly required/optional
const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dob: z.date({
    required_error: "Date of birth is required",
  }),
  alcoholInvolved: z.boolean(),
  triageTag: z.string().optional(),
});

// Define our form values type
type FormValues = z.infer<typeof formSchema>;

interface PatientDetailsFormProps {
  patient: {
    id: string;
    eventId: string;
    firstName: string;
    lastName: string;
    dob: string | Date;
    alcoholInvolved: boolean;
    triageTag: string | null;
    fileAttachmentUrl: string | null;
  };
  canEdit: boolean;
  eventState: string;
}

export function PatientDetailsForm({ patient, canEdit }: PatientDetailsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(patient.fileAttachmentUrl);
  
  // Explicitly type the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: patient.firstName,
      lastName: patient.lastName,
      dob: new Date(patient.dob),
      alcoholInvolved: patient.alcoholInvolved,
      triageTag: patient.triageTag || undefined,
    },
  });
  
  // Define the submit handler
  const onSubmit = form.handleSubmit(async (values: FormValues) => {
    if (!canEdit) return;
    
    setIsSubmitting(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("firstName", values.firstName);
      formData.append("lastName", values.lastName);
      formData.append("dob", values.dob.toISOString());
      formData.append("alcoholInvolved", String(values.alcoholInvolved));
      
      if (values.triageTag) {
        formData.append("triageTag", values.triageTag);
      }
      
      if (file) {
        formData.append("fileAttachment", file);
      }
      
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to update patient details");
      }
      
      toast.success("Patient updated", {
        description: "Patient details have been updated successfully."
      });
      
      router.refresh();
    } catch (error) {
      console.error("Error updating patient:", error);
      toast.error("Error", {
        description: "Failed to update patient details. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  });
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create a temporary URL for preview
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter first name" 
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
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter last name" 
                        {...field} 
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Birth</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild disabled={!canEdit}>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`w-full pl-3 text-left font-normal ${
                            !field.value && "text-muted-foreground"
                          }`}
                          disabled={!canEdit}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select date of birth</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The patient&apos;s date of birth will be used to calculate age.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="triageTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Triage Tag</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!canEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select triage tag color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No tag</SelectItem>
                        <SelectItem value="GREEN">Green</SelectItem>
                        <SelectItem value="YELLOW">Yellow</SelectItem>
                        <SelectItem value="RED">Red</SelectItem>
                        <SelectItem value="BLACK">Black</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The patient&apos;s triage category.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="alcoholInvolved"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Alcohol Involved</FormLabel>
                      <FormDescription>
                        Indicate if alcohol was a factor in this case.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canEdit}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormLabel>File Attachment</FormLabel>
              <div className="mt-2">
                {fileUrl ? (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                        <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-medium">Attached file</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {file ? file.name : "View attachment"}
                        </p>
                      </div>
                      <div>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  </div>
                ) : canEdit ? (
                  <div className="flex items-center justify-center rounded-md border-2 border-dashed border-gray-300 py-6 dark:border-gray-700">
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-center"
                    >
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <span className="mt-2 block text-sm font-medium">
                        Upload a file
                      </span>
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                        Image or PDF files only
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleFileChange}
                        disabled={!canEdit}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 py-6 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No file attached
                    </p>
                  </div>
                )}
              </div>
              {/* Hidden field for the file upload */}
              <input 
                type="hidden" 
                name="existingFileUrl" 
                value={patient.fileAttachmentUrl || ''} 
              />
            </div>
          </CardContent>
          
          {canEdit && (
            <CardFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="ml-auto"
              >
                {isSubmitting ? "Saving..." : "Save Patient Info"}
              </Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}