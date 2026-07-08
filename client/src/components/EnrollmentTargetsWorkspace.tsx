import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Trash2, Plus, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EnrollmentTarget = {
  id: number;
  targetType: string;
  targetName: string;
  targetValue: number;
};

export function EnrollmentTargetsWorkspace() {
  const { toast } = useToast();
  
  const { data: targets, isLoading } = useQuery<EnrollmentTarget[]>({
    queryKey: ["/api/enrollment-targets"],
  });

  const [newType, setNewType] = useState<string>("Department");
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");

  const addMutation = useMutation({
    mutationFn: async (target: Omit<EnrollmentTarget, "id">) => {
      const res = await apiRequest("POST", "/api/enrollment-targets", target);
      if (!res.ok) throw new Error("Failed to add target");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment-targets"] });
      toast({ title: "Target added successfully" });
      setNewName("");
      setNewValue("");
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/enrollment-targets/${id}`);
      if (!res.ok) throw new Error("Failed to delete target");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment-targets"] });
      toast({ title: "Target deleted" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const handleAdd = () => {
    if (!newName || !newValue) return;
    addMutation.mutate({
      targetType: newType,
      targetName: newName,
      targetValue: parseInt(newValue, 10),
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Target className="h-6 w-6 text-teal-600" />
          Enrollment Targets
        </h2>
        <p className="text-slate-500 mt-1">Manage target numbers for overall enrollees, departments, and programs.</p>
      </div>

      <Card className="border-white/70 bg-white/70 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg">Add New Target</CardTitle>
          <CardDescription>Input a new enrollment target to display in the GIS Map Sidebar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1.5 flex-1 max-w-xs">
              <label className="text-xs font-semibold text-slate-500 uppercase">Target Type</label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Overall">Overall</SelectItem>
                  <SelectItem value="Department">Department</SelectItem>
                  <SelectItem value="Program">Program</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5 flex-1 max-w-xs">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                {newType === "Overall" ? "Label (e.g. Total)" : newType + " Name"}
              </label>
              <Input 
                placeholder={newType === "Overall" ? "Total Enrollees" : newType === "Department" ? "e.g. CCS" : "e.g. BSIT"} 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 flex-1 max-w-xs">
              <label className="text-xs font-semibold text-slate-500 uppercase">Target Enrollees</label>
              <Input 
                type="number"
                placeholder="e.g. 5000" 
                value={newValue} 
                onChange={e => setNewValue(e.target.value)}
              />
            </div>

            <Button 
              className="bg-teal-600 hover:bg-teal-700 h-10 w-full sm:w-auto mt-2 sm:mt-0"
              onClick={handleAdd}
              disabled={!newName || !newValue || addMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Target
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/70 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur-xl flex-1 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-100">
          <CardTitle className="text-lg">Active Targets</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/enrollment-targets"] })}>
            <RefreshCcw className="h-4 w-4 text-slate-500" />
          </Button>
        </CardHeader>
        <div className="overflow-auto max-h-[500px]">
          <Table>
            <TableHeader className="bg-slate-50/50 sticky top-0">
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Target Value</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!targets || targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                    {isLoading ? "Loading..." : "No targets configured yet."}
                  </TableCell>
                </TableRow>
              ) : (
                targets.map(target => (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium text-slate-700">{target.targetType}</TableCell>
                    <TableCell>{target.targetName}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{target.targetValue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => deleteMutation.mutate(target.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
