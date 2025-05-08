"use client";

import { useNavigation } from "@/components/navigation-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function UnsavedChangesDialog() {
  const {
    showUnsavedChangesDialog,
    confirmNavigation,
    cancelNavigation,
  } = useNavigation();

  return (
    <AlertDialog open={showUnsavedChangesDialog} onOpenChange={cancelNavigation}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes that will be lost if you leave this page.
            Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelNavigation}>
            Stay on this page
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmNavigation}>
            Leave page
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}