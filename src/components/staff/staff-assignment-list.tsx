"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, UserX, ShieldCheck, Shield } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  role: string;
}

interface StaffAssignmentListProps {
  staff: StaffMember[];
  eventId: string;
  canEdit: boolean;
}

export function StaffAssignmentList({ staff, eventId, canEdit }: StaffAssignmentListProps) {
  const router = useRouter();
  const [staffToRemove, setStaffToRemove] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  
  const handleRemoveStaff = async () => {
    if (!staffToRemove) return;
    
    setIsRemoving(true);
    
    try {
      const response = await fetch(`/api/events/${eventId}/staff/${staffToRemove}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to remove staff member");
      }
      
      toast.success("Staff removed", {
        description: "Staff member has been removed from this event."
      });
      
      router.refresh();
    } catch (error) {
      console.error("Error removing staff:", error);
      toast.error("Error", {
        description: "Failed to remove staff member. Please try again."
      });
    } finally {
      setIsRemoving(false);
      setStaffToRemove(null);
    }
  };
  
  if (staff.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          <User className="h-6 w-6 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium">No staff assigned</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          No staff members have been assigned to this event yet.
        </p>
        {canEdit && (
          <Button asChild className="mt-6">
            <a href={`/events/${eventId}/staff/assign`}>Assign Staff</a>
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Type</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.userName}</TableCell>
                <TableCell>{member.userEmail}</TableCell>
                <TableCell>
                  <Badge variant="outline">{member.role}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {member.userRole === "ADMIN" ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-purple-500" />
                        <Badge variant="secondary">ADMIN</Badge>
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 text-blue-500" />
                        <Badge>EMT</Badge>
                      </>
                    )}
                  </div>
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <AlertDialog open={staffToRemove === member.id} onOpenChange={(open) => !open && setStaffToRemove(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                          onClick={() => setStaffToRemove(member.id)}
                        >
                          <UserX className="mr-1 h-4 w-4" />
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {member.userName} from this event?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleRemoveStaff}
                            disabled={isRemoving}
                            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                          >
                            {isRemoving ? "Removing..." : "Remove"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}