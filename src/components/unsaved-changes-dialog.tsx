"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

interface NavigationContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  showUnsavedChangesDialog: boolean;
  setShowUnsavedChangesDialog: (value: boolean) => void;
  attemptedNavigation: string | null;
  setAttemptedNavigation: (value: string | null) => void;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [attemptedNavigation, setAttemptedNavigation] = useState<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();
  
  // Warning function for beforeunload event
  const warnUser = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = "";
      return "";
    }
  };
  
  // Set up beforeunload event listener
  useEffect(() => {
    if (hasUnsavedChanges) {
      window.addEventListener("beforeunload", warnUser);
      return () => {
        window.removeEventListener("beforeunload", warnUser);
      };
    }
  }, [hasUnsavedChanges]);
  
  // Confirm navigation function
  const confirmNavigation = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedChangesDialog(false);
    
    if (attemptedNavigation) {
      router.push(attemptedNavigation);
    }
    
    setAttemptedNavigation(null);
  };
  
  // Cancel navigation function
  const cancelNavigation = () => {
    setShowUnsavedChangesDialog(false);
    setAttemptedNavigation(null);
  };
  
  return (
    <NavigationContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        showUnsavedChangesDialog,
        setShowUnsavedChangesDialog,
        attemptedNavigation,
        setAttemptedNavigation,
        confirmNavigation,
        cancelNavigation,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  
  return context;
}