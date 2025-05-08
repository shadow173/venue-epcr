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
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";

// Define form schema with Zod
const formSchema = z.object({
  bloodPressure: z.string().optional(),
  heartRate: z.number().min(0).max(300).optional(),
  respiratoryRate: z.number().min(0).max(100).optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  temperature: z.number().min(70).max(110).optional(),
  glucoseLevel: z.number().min(0).max(1000).optional(),
  painScale: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
});

type FormValues = z.infer<typeof formSchema>;

interface VitalsFormProps {
  patientId: string;
  eventId: string;
  vitalId?: string;
  initialData?: Partial<FormValues>;
}

export function VitalsForm({ patientId, eventId, vitalId, initialData }: VitalsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultValues: Partial<FormValues> = {
    bloodPressure: "",
    heartRate: undefined,
    respiratoryRate: undefined,
    oxygenSaturation: undefined,
    temperature: undefined,
    glucoseLevel: undefined,
    painScale: 0,
    notes: "",
    timestamp: new Date(),
    ...initialData,
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      // Endpoint is always POST for new vitals (PATCH not implemented for vitals)
      const endpoint = `/api/patients/${patientId}/vitals`;
      
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
        throw new Error(`Failed to record vitals`);
      }
      
      toast({
        title: "Vitals recorded",
        description: "Patient vitals have been successfully recorded.",
      });
      
      // Redirect to patient detail page
      router.push(`/events/${eventId}/patients/${patientId}`);
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to record vitals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Vitals</CardTitle>
        <CardDescription>
          Record patient vitals information.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bloodPressure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Pressure</FormLabel>
                    <FormControl>
                      <Input placeholder="120/80" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="heartRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heart Rate (BPM)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Heart rate" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="respiratoryRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Respiratory Rate</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Respiratory rate" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="oxygenSaturation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oxygen Saturation (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="SpO2" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature (°F)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="Temperature" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="glucoseLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Glucose (mg/dL)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Blood glucose" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="painScale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pain Scale (0-10)</FormLabel>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">0</span>
                    <FormControl>
                      <Slider
                        value={[field.value ?? 0]}
                        min={0}
                        max={10}
                        step={1}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                    </FormControl>
                    <span className="text-sm">10</span>
                    <span className="ml-4 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {field.value ?? 0}
                    </span>
                  </div>
                  <FormDescription>
                    0 = No pain, 10 = Worst possible pain
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about vitals"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
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
              {isSubmitting ? "Saving..." : "Record Vitals"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}