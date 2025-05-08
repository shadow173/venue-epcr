// src/components/staff/staff-assignment-list.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  UserRound,
  Mail,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  UserPlus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StaffMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface StaffAssignmentListProps {
  staff: StaffMember[];
  eventId: string;
  canEdit: boolean;
}

export function StaffAssignmentList({ staff, eventId, canEdit }: StaffAssignmentListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [staffToRemove, setStaffToRemove] = useState<StaffMember | null>(null);
  
  // Apply filters to the staff list
  const filteredStaff = staff.filter((member) => {
    // Apply search filter (case insensitive)
    const searchMatch = searchQuery === "" || 
      member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply role filter
    const roleMatch = roleFilter === "" || member.role === roleFilter;
    
    return searchMatch && roleMatch;
  });
  
  // Get unique roles for the filter dropdown
  const uniqueRoles = Array.from(new Set(staff.map(member => member.role)));
  
  // Handle removing a staff member
  const handleRemoveStaff = async () => {
    if (!staffToRemove) return;
    
    try {
      const response = await fetch(`/api/events/${eventId}/staff/${staffToRemove.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Refresh the page to show updated staff list
        router.refresh();
        setIsRemoveDialogOpen(false);
      } else {
        console.error('Failed to remove staff member');
      }
    } catch (error) {
      console.error('Error removing staff member:', error);
    }
  };
  
  // If no staff after filtering
  if (filteredStaff.length === 0) {
    return (
      <div>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                placeholder="Search staff..."
                className="w-full pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {uniqueRoles.length > 0 && (
            <div className="flex gap-4">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
            <AlertTriangle className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium">No staff found</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {staff.length === 0
              ? "No staff members have been assigned to this event yet."
              : "No staff members match your search criteria."}
          </p>
          {canEdit && (
            <Button asChild className="mt-4">
              <Link href={`/events/${eventId}/staff/assign`}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Staff
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="search"
              placeholder="Search staff..."
              className="w-full pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {uniqueRoles.length > 0 && (
          <div className="flex gap-4">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roles</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>System Role</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staffMember) => (
                <TableRow key={staffMember.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <UserRound className="mr-2 h-4 w-4 text-gray-400" />
                      {staffMember.user.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Mail className="mr-2 h-4 w-4" />
                      {staffMember.user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {staffMember.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <ShieldCheck className="mr-2 h-4 w-4 text-gray-400" />
                      <Badge variant={staffMember.user.role === "ADMIN" ? "secondary" : "default"}>
                        {staffMember.user.role}
                      </Badge>
                    </div>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Dialog open={isRemoveDialogOpen && staffToRemove?.id === staffMember.id} onOpenChange={setIsRemoveDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setStaffToRemove(staffMember)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Staff Member</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove {staffMember.user.name} from this event?
                              This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleRemoveStaff}>
                              Remove
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}