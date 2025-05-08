"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronDown, Upload } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";

// Define form schema with Zod
const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dob: z.date({
    required_error: "Date of birth is required",
  }),
  alcoholInvolved: z.boolean().default(false),
  triageTag: z.string().optional(),
  fileAttachment: z.any().optional(),
});

type PatientFormValues = z.infer<typeof formSchema>;

interface PatientFormProps {
  eventId: string;
  eventState: string;
  patientId?: string;
  initialData?: Partial<PatientFormValues>;
}

export function PatientForm({ eventId, eventState, patientId, initialData }: PatientFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const defaultValues: Partial<PatientFormValues> = {
    firstName: "",
    lastName: "",
    dob: undefined,
    alcoholInvolved: false,
    triageTag: "",
    ...initialData,
  };
  
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  async function onSubmit(values: PatientFormValues) {
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
      
      // Determine API endpoint and method
      const endpoint = patientId 
        ? `/api/events/${eventId}/patients/${patientId}` 
        : `/api/events/${eventId}/patients`;
      
      const method = patientId ? "PATCH" : "POST";
      
      // Submit the form
      const response = await fetch(endpoint, {
        method,
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${patientId ? "update" : "create"} patient`);
      }
      
      const data = await response.json();
      
      toast({
        title: patientId ? "Patient updated" : "Patient created",
        description: `Patient record has been successfully ${patientId ? "updated" : "created"}.`,
      });
      
      // Redirect to patient detail page
      router.push(`/events/${eventId}/patients/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: `Failed to ${patientId ? "update" : "create"} patient. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{patientId ? "Edit" : "New"} Patient</CardTitle>
        <CardDescription>
          Enter the patient information for this {eventState} EPCR record.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
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
                      <Input placeholder="Enter last name" {...field} />
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
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`w-full pl-3 text-left font-normal ${
                            !field.value && "text-muted-foreground"
                          }`}
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
                    The patient's date of birth will be used to calculate age.
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
                      The patient's triage category.
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
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormLabel>File Attachment</FormLabel>
              <div className="mt-2 flex items-center space-x-4">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  <span>Upload file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
                <div className="flex-1 truncate">
                  {file ? (
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="truncate">{file.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No file selected</span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Upload patient documents, images, or other relevant files. Max 10MB.
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : patientId ? "Update Patient" : "Create Patient"}
        </Button>
      </CardFooter>
    </Card>
  );
}