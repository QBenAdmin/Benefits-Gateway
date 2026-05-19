import { useState } from "react";
import { useListBenefitPlans, useCreateBenefitPlan, useListCarriers, getListBenefitPlansQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Heart, Shield, Eye, Users } from "lucide-react";

const planIcons: Record<string, React.ElementType> = {
  health: Heart,
  dental: Shield,
  vision: Eye,
  life: Users,
};

export default function Benefits() {
  const { data: plans, isLoading } = useListBenefitPlans({}, { query: { queryKey: getListBenefitPlansQueryKey({}) } });

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-[Outfit] font-semibold tracking-tight">Benefits Plans</h2>
          <p className="text-muted-foreground">Manage available benefit plans and configuration.</p>
        </div>
        <div className="flex items-center gap-2">
          <AddPlanDialog />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))
        ) : plans?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">No plans configured yet.</div>
        ) : (
          plans?.map((plan) => {
            const Icon = planIcons[plan.type.toLowerCase()] || Shield;
            return (
              <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">{plan.type}</Badge>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>{plan.carrierName}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2 text-sm">
                  <div className="grid grid-cols-2 gap-y-2 mt-4">
                    <div className="text-muted-foreground">Employee Cost</div>
                    <div className="text-right font-medium">${plan.employeeCost || 0}/mo</div>
                    <div className="text-muted-foreground">Employer Cost</div>
                    <div className="text-right font-medium">${plan.employerCost || 0}/mo</div>
                    <div className="text-muted-foreground">Deductible</div>
                    <div className="text-right font-medium">${plan.deductible || 0}</div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t mt-4 flex justify-between items-center text-sm text-muted-foreground">
                  <div>{plan.enrolledCount} enrolled</div>
                  <Button variant="ghost" size="sm">Manage</Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function AddPlanDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("health");
  const [carrierId, setCarrierId] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createPlan = useCreateBenefitPlan();
  const { data: carriers } = useListCarriers();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!carrierId) return;

    createPlan.mutate({
      data: {
        name: formData.get("name") as string,
        type: type,
        carrierId: parseInt(carrierId, 10),
        employeeCost: parseFloat(formData.get("employeeCost") as string) || 0,
        employerCost: parseFloat(formData.get("employerCost") as string) || 0,
        deductible: parseFloat(formData.get("deductible") as string) || 0,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Plan created successfully" });
        queryClient.invalidateQueries({ queryKey: getListBenefitPlansQueryKey() });
        setOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to create plan", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Benefit Plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input id="name" name="name" required placeholder="e.g. Bronze PPO" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Plan Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="dental">Dental</SelectItem>
                    <SelectItem value="vision">Vision</SelectItem>
                    <SelectItem value="life">Life</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Select value={carrierId} onValueChange={setCarrierId}>
                  <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                  <SelectContent>
                    {carriers?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeCost">Employee Cost ($)</Label>
                <Input id="employeeCost" name="employeeCost" type="number" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employerCost">Employer Cost ($)</Label>
                <Input id="employerCost" name="employerCost" type="number" step="0.01" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductible">Deductible ($)</Label>
              <Input id="deductible" name="deductible" type="number" step="0.01" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createPlan.isPending}>
              {createPlan.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}