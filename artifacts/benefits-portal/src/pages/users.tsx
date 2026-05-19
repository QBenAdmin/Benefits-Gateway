import { useState } from "react";
import { 
  useListUsers, 
  useCreateUser, 
  useUpdateUser, 
  useDeleteUser, 
  getListUsersQueryKey,
  useListEmployers,
  getListEmployersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, UserCog, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Users() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = useListUsers(undefined, { query: { queryKey: getListUsersQueryKey() } });
  
  const filteredUsers = users?.filter(user => 
    user.firstName.toLowerCase().includes(search.toLowerCase()) || 
    user.lastName.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Admin Users</h2>
          <p className="text-muted-foreground">Manage system administrators and company representatives.</p>
        </div>
        <div className="flex items-center gap-2">
          <AddUserDialog />
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Each company can have up to 3 authorized users with manager or viewer roles.</AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCog className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.firstName} {user.lastName}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'} className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.employerName || 'System'}</TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy HH:mm') : 'Never'}</TableCell>
                    <TableCell className="text-right">
                      <UserActions user={user} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function UserActions({ user }: { user: any }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();

  const handleDelete = () => {
    deleteMutation.mutate({ params: { id: user.id } }, {
      onSuccess: () => {
        toast({ title: "User deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setDeleteOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to delete user", variant: "destructive" });
      }
    });
  };

  const handleToggleActive = () => {
    updateMutation.mutate({ params: { id: user.id }, data: { isActive: !user.isActive } }, {
      onSuccess: () => {
        toast({ title: `User ${user.isActive ? 'deactivated' : 'activated'} successfully` });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update user status", variant: "destructive" });
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit Details</DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleActive}>
            {user.isActive ? "Deactivate User" : "Activate User"}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog open={editOpen} setOpen={setEditOpen} user={user} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {user.firstName} {user.lastName}? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("manager");
  const [employerId, setEmployerId] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createUser = useCreateUser();
  const { data: employers } = useListEmployers(undefined, { query: { queryKey: getListEmployersQueryKey() } });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      role: role,
      employerId: role === 'admin' ? undefined : (employerId ? parseInt(employerId) : undefined),
    };
    
    createUser.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "User created successfully" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to create user", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">System Admin</SelectItem>
                  <SelectItem value="manager">Employer Manager</SelectItem>
                  <SelectItem value="viewer">Employer Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role !== 'admin' && (
              <div className="space-y-2">
                <Label>Employer</Label>
                <Select value={employerId} onValueChange={setEmployerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employer" />
                  </SelectTrigger>
                  <SelectContent>
                    {employers?.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Note: Max 3 users per employer.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ open, setOpen, user }: { open: boolean, setOpen: (v: boolean) => void, user: any }) {
  const [role, setRole] = useState(user.role);
  const [employerId, setEmployerId] = useState(user.employerId?.toString() || "");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateUser = useUpdateUser();
  const { data: employers } = useListEmployers(undefined, { query: { queryKey: getListEmployersQueryKey() } });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      role: role,
      employerId: role === 'admin' ? undefined : (employerId ? parseInt(employerId) : undefined),
    };
    
    updateUser.mutate({ params: { id: user.id }, data }, {
      onSuccess: () => {
        toast({ title: "User updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to update user", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" defaultValue={user.firstName} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" defaultValue={user.lastName} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" defaultValue={user.email} required />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">System Admin</SelectItem>
                  <SelectItem value="manager">Employer Manager</SelectItem>
                  <SelectItem value="viewer">Employer Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role !== 'admin' && (
              <div className="space-y-2">
                <Label>Employer</Label>
                <Select value={employerId} onValueChange={setEmployerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employer" />
                  </SelectTrigger>
                  <SelectContent>
                    {employers?.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
