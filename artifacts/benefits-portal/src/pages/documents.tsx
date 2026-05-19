import { useState } from "react";
import { useListDocuments, useCreateDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
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
import { Plus, Search, FileText, Upload, Send, FileCode } from "lucide-react";
import { format } from "date-fns";

export default function Documents() {
  const [search, setSearch] = useState("");
  const { data: documents, isLoading } = useListDocuments({}, { query: { queryKey: getListDocumentsQueryKey({}) } });

  const filteredDocs = documents?.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.fileName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">Manage enrollment forms, plan summaries, and carrier docs.</p>
        </div>
        <div className="flex items-center gap-2">
          <AddDocumentDialog />
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
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
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredDocs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No documents found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                          {doc.isPdfFillable ? <FileCode className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{doc.name}</span>
                          <span className="text-xs text-muted-foreground">{doc.fileName}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {doc.type.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{doc.carrierName || '-'}</TableCell>
                    <TableCell>{doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : '-'}</TableCell>
                    <TableCell>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">View</Button>
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

function AddDocumentDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("enrollment-form");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createDoc = useCreateDocument();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Simulate upload delay
    createDoc.mutate({
      data: {
        name: formData.get("name") as string,
        type: type,
        fileName: (formData.get("file") as File)?.name || "document.pdf",
        fileSize: (formData.get("file") as File)?.size || 0,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Document uploaded successfully" });
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        setOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to upload document", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Document Name</Label>
              <Input id="name" name="name" required placeholder="e.g. 2025 Aetna Enrollment Form" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Document Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrollment-form">Enrollment Form</SelectItem>
                  <SelectItem value="summary-plan-description">Summary Plan Description</SelectItem>
                  <SelectItem value="claim-form">Claim Form</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File (PDF)</Label>
              <Input id="file" name="file" type="file" accept=".pdf" required />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createDoc.isPending}>
              {createDoc.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}