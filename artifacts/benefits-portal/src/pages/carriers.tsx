import { useState } from "react";
import { useListCarriers, useCreateCarrier, useTestCarrierConnection, getListCarriersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Building2, CheckCircle2, XCircle, AlertCircle, Wifi } from "lucide-react";

export default function Carriers() {
  const [search, setSearch] = useState("");
  const { data: carriers, isLoading } = useListCarriers();
  const testConnection = useTestCarrierConnection();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleTestConnection = (id: number) => {
    testConnection.mutate({ id }, {
      onSuccess: (res) => {
        toast({ 
          title: res.success ? "Connection successful" : "Connection failed", 
          description: res.message,
          variant: res.success ? "default" : "destructive" 
        });
        queryClient.invalidateQueries({ queryKey: getListCarriersQueryKey() });
      }
    });
  };

  const filteredCarriers = carriers?.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Carriers</h2>
          <p className="text-muted-foreground">Manage insurance carrier connections and EDI setups.</p>
        </div>
        <div className="flex items-center gap-2">
          <AddCarrierDialog />
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search carriers..."
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
                <TableHead>Carrier Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Connection Methods</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCarriers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No carriers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCarriers?.map((carrier) => (
                  <TableRow key={carrier.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-secondary-foreground" />
                        </div>
                        <span className="font-medium">{carrier.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{carrier.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {carrier.ediEnabled && <Badge variant="outline">EDI</Badge>}
                        {carrier.sftpEnabled && <Badge variant="outline">SFTP</Badge>}
                        {carrier.apiEnabled && <Badge variant="outline">API</Badge>}
                        {!carrier.ediEnabled && !carrier.sftpEnabled && !carrier.apiEnabled && (
                          <Badge variant="secondary">Email Only</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {carrier.connectionStatus === 'connected' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {carrier.connectionStatus === 'disconnected' && <XCircle className="h-4 w-4 text-destructive" />}
                        {carrier.connectionStatus === 'untested' && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                        <span className="capitalize text-sm">{carrier.connectionStatus}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(carrier.ediEnabled || carrier.sftpEnabled || carrier.apiEnabled) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleTestConnection(carrier.id)}
                            disabled={testConnection.isPending && testConnection.variables?.id === carrier.id}
                          >
                            <Wifi className="mr-2 h-4 w-4" />
                            Test
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">Edit</Button>
                      </div>
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

function AddCarrierDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("health");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createCarrier = useCreateCarrier();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createCarrier.mutate({
      data: {
        name: formData.get("name") as string,
        type: type,
        contactEmail: formData.get("contactEmail") as string,
        enrollmentEmail: formData.get("enrollmentEmail") as string,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Carrier created successfully" });
        queryClient.invalidateQueries({ queryKey: getListCarriersQueryKey() });
        setOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to create carrier", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Carrier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Carrier</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Carrier Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Primary Coverage Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="vision">Vision</SelectItem>
                  <SelectItem value="life">Life</SelectItem>
                  <SelectItem value="disability">Disability</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enrollmentEmail">Enrollment Email (Fallback)</Label>
              <Input id="enrollmentEmail" name="enrollmentEmail" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Account Manager Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createCarrier.isPending}>
              {createCarrier.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}