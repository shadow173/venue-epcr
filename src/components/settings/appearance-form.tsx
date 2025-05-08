/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useTheme } from "next-themes";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { toast } from "sonner"; // Changed toast import
import { SunIcon, MoonIcon, LaptopIcon } from "lucide-react";

// Define form schema
const formSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

type FormValues = z.infer<typeof formSchema>;

export function AppearanceForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      theme: (theme as any) || "system",
    },
  });
  
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      setTheme(values.theme);
      
      // Updated toast usage to match Sonner pattern
      toast.success("Appearance updated", {
        description: "Your theme preference has been updated."
      });
    } catch (error) {
      console.error("Error updating appearance:", error);
      toast.error("Error", {
        description: "Failed to update appearance. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Theme</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex flex-col items-center space-y-2">
                        <FormControl>
                          <RadioGroupItem
                            value="light"
                            id="theme-light"
                            className="sr-only"
                          />
                        </FormControl>
                        <label
                          htmlFor="theme-light"
                          className={`flex h-16 w-16 flex-col items-center justify-center rounded-md border-2 ${
                            field.value === "light"
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-700"
                          } p-2`}
                        >
                          <SunIcon className="mb-2 h-6 w-6" />
                          <span className="text-xs">Light</span>
                        </label>
                      </FormItem>
                      
                      <FormItem className="flex flex-col items-center space-y-2">
                        <FormControl>
                          <RadioGroupItem
                            value="dark"
                            id="theme-dark"
                            className="sr-only"
                          />
                        </FormControl>
                        <label
                          htmlFor="theme-dark"
                          className={`flex h-16 w-16 flex-col items-center justify-center rounded-md border-2 ${
                            field.value === "dark"
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-700"
                          } p-2`}
                        >
                          <MoonIcon className="mb-2 h-6 w-6" />
                          <span className="text-xs">Dark</span>
                        </label>
                      </FormItem>
                      
                      <FormItem className="flex flex-col items-center space-y-2">
                        <FormControl>
                          <RadioGroupItem
                            value="system"
                            id="theme-system"
                            className="sr-only"
                          />
                        </FormControl>
                        <label
                          htmlFor="theme-system"
                          className={`flex h-16 w-16 flex-col items-center justify-center rounded-md border-2 ${
                            field.value === "system"
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-700"
                          } p-2`}
                        >
                          <LaptopIcon className="mb-2 h-6 w-6" />
                          <span className="text-xs">System</span>
                        </label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Select the theme for the application.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          
          <CardFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="ml-auto"
            >
              {isSubmitting ? "Saving..." : "Save Preferences"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}