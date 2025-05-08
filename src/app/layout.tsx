import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { NavigationProvider } from "@/components/navigation-context";
import { AuthProvider } from "@/components/auth-provider";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EMS EPCR System",
  description: "Electronic Patient Care Reporting System for EMS Providers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <NavigationProvider>
              {children}
              <Toaster />
              <UnsavedChangesDialog />
            </NavigationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}