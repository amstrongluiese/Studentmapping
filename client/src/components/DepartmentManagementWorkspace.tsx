import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Trash2, Edit2, Bookmark, BookmarkCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Department, Program } from "@shared/schema";

export function DepartmentManagementWorkspace() {
  const { toast } = useToast();
  
  const { data: departments, isLoading: isLoadingDepts } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: programs, isLoading: isLoadingProgs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptColor, setNewDeptColor] = useState("#000000");

  const [newProgDeptId, setNewProgDeptId] = useState<number | "">("");
  const [newProgCode, setNewProgCode] = useState("");
  const [newProgName, setNewProgName] = useState("");
  const [newProgColor, setNewProgColor] = useState("#000000");

  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingProg, setEditingProg] = useState<Program | null>(null);

  const addDeptMutation = useMutation({
    mutationFn: async (dept: Partial<Department>) => {
      const res = await apiRequest("POST", "/api/departments", dept);
      if (!res.ok) throw new Error("Failed to add department");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Department added successfully" });
      setNewDeptCode("");
      setNewDeptName("");
      setNewDeptColor("#000000");
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/departments/${id}`);
      if (!res.ok) throw new Error("Failed to delete department");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Department and its programs deleted" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const addProgMutation = useMutation({
    mutationFn: async (prog: Partial<Program>) => {
      const res = await apiRequest("POST", "/api/programs", prog);
      if (!res.ok) throw new Error("Failed to add program");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Program added successfully" });
      setNewProgCode("");
      setNewProgName("");
      setNewProgColor("#000000");
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const deleteProgMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/programs/${id}`);
      if (!res.ok) throw new Error("Failed to delete program");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Program deleted" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const updateDeptMutation = useMutation({
    mutationFn: async (dept: Partial<Department>) => {
      const res = await apiRequest("POST", "/api/departments", dept);
      if (!res.ok) throw new Error("Failed to update department");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Department updated successfully" });
      setEditingDept(null);
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const updateProgMutation = useMutation({
    mutationFn: async (prog: Partial<Program>) => {
      const res = await apiRequest("POST", "/api/programs", prog);
      if (!res.ok) throw new Error("Failed to update program");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Program updated successfully" });
      setEditingProg(null);
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const handleAddDept = () => {
    if (!newDeptCode || !newDeptName) return;
    addDeptMutation.mutate({ code: newDeptCode, name: newDeptName, color: newDeptColor, targetValue: 0 });
  };

  const handleAddProg = () => {
    if (!newProgDeptId || !newProgCode || !newProgName) return;
    addProgMutation.mutate({ 
      departmentId: Number(newProgDeptId), 
      code: newProgCode, 
      name: newProgName, 
      color: newProgColor,
      targetValue: 0 
    });
  };

  if (isLoadingDepts || isLoadingProgs) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-indigo-600" />
          Department Management
        </h2>
        <p className="text-slate-500 mt-1">Manage academic departments, their specific programs, and enrollment targets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-white/70 bg-white/70 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg">Add New Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Input placeholder="Code (e.g. CCS)" value={newDeptCode} onChange={e => setNewDeptCode(e.target.value)} />
              <Input placeholder="Full Name" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
              <div className="flex items-center gap-2">
                <Input type="color" className="w-16 h-10 p-1" value={newDeptColor} onChange={e => setNewDeptColor(e.target.value)} />
                <span className="text-sm text-slate-500">Department Color</span>
              </div>
              <Button onClick={handleAddDept} disabled={addDeptMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" /> Add Department
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/70 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg">Add New Program</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={newProgDeptId} 
                onChange={e => {
                  const deptId = Number(e.target.value);
                  setNewProgDeptId(deptId);
                  const selectedDept = departments?.find(d => d.id === deptId);
                  if (selectedDept) {
                    setNewProgColor(selectedDept.color);
                  }
                }}
              >
                <option value="" disabled>Select Department</option>
                {departments?.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
              </select>
              <Input placeholder="Program Code (e.g. BSCS CS)" value={newProgCode} onChange={e => setNewProgCode(e.target.value)} />
              <Input placeholder="Program Name" value={newProgName} onChange={e => setNewProgName(e.target.value)} />
              <div className="flex items-center gap-2">
                <Input type="color" className="w-16 h-10 p-1" value={newProgColor} onChange={e => setNewProgColor(e.target.value)} />
                <span className="text-sm text-slate-500">Program Color (Defaults to Dept Color)</span>
              </div>
              <Button onClick={handleAddProg} disabled={addProgMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" /> Add Program
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/70 bg-white/70 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur-xl mt-4">
        <CardHeader>
          <CardTitle>Departments & Programs</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {departments?.map(dept => {
              const deptPrograms = programs?.filter(p => p.departmentId === dept.id) || [];
              return (
                <AccordionItem value={`dept-${dept.id}`} key={dept.id} className="border-b-0 mb-4 bg-slate-50/50 rounded-lg overflow-hidden border">
                  <div className="flex items-center justify-between pr-4 bg-white">
                    <AccordionTrigger className="hover:no-underline px-4 py-3 flex-1 justify-start gap-4">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dept.color }} />
                      <span className="font-bold text-slate-800">{dept.code}</span>
                      <span className="text-slate-600 font-normal">{dept.name}</span>
                    </AccordionTrigger>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold bg-slate-100 px-2 py-1 rounded text-slate-600 mr-2">
                        Target: {dept.targetValue}
                      </span>
                      <Button variant="ghost" size="icon" className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); setEditingDept(dept); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); deleteDeptMutation.mutate(dept.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="bg-slate-50/50 p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Code</TableHead>
                          <TableHead>Program Name</TableHead>
                          <TableHead>Track</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deptPrograms.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-slate-500 py-4">No programs added yet.</TableCell>
                          </TableRow>
                        )}
                        {deptPrograms.map(prog => (
                          <TableRow key={prog.id} className="bg-white">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prog.color }} />
                                {prog.code}
                              </div>
                            </TableCell>
                            <TableCell>{prog.name}</TableCell>
                            <TableCell>{prog.track || "-"}</TableCell>
                            <TableCell>{prog.targetValue}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 h-8 w-8" onClick={() => setEditingProg(prog)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8" onClick={() => deleteProgMutation.mutate(prog.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Edit Department Dialog */}
      <Dialog open={!!editingDept} onOpenChange={(o) => !o && setEditingDept(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription className="hidden">Edit department details</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Department Code</Label>
              <Input 
                value={editingDept?.code || ""} 
                onChange={e => setEditingDept(prev => prev ? {...prev, code: e.target.value} : null)} 
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Department Name</Label>
              <Input 
                value={editingDept?.name || ""} 
                onChange={e => setEditingDept(prev => prev ? {...prev, name: e.target.value} : null)} 
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Target Enrollees</Label>
              <Input 
                type="number"
                value={editingDept?.targetValue || 0} 
                onChange={e => setEditingDept(prev => prev ? {...prev, targetValue: Number(e.target.value)} : null)} 
              />
            </div>
            <div className="flex items-center gap-2">
              <Input 
                type="color" className="w-16 h-10 p-1" 
                value={editingDept?.color || "#000"} 
                onChange={e => setEditingDept(prev => prev ? {...prev, color: e.target.value} : null)} 
              />
              <span className="text-sm text-slate-500">Department Color</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDept(null)}>Cancel</Button>
            <Button onClick={() => editingDept && updateDeptMutation.mutate(editingDept)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={!!editingProg} onOpenChange={(o) => !o && setEditingProg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription className="hidden">Edit program details</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Department</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={editingProg?.departmentId || ""} 
                onChange={e => {
                  const deptId = Number(e.target.value);
                  setEditingProg(prev => prev ? {...prev, departmentId: deptId} : null);
                }}
              >
                {departments?.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Program Code</Label>
              <Input 
                value={editingProg?.code || ""} 
                onChange={e => setEditingProg(prev => prev ? {...prev, code: e.target.value} : null)} 
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Program Name</Label>
              <Input 
                value={editingProg?.name || ""} 
                onChange={e => setEditingProg(prev => prev ? {...prev, name: e.target.value} : null)} 
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Target Enrollees</Label>
              <Input 
                type="number"
                value={editingProg?.targetValue || 0} 
                onChange={e => setEditingProg(prev => prev ? {...prev, targetValue: Number(e.target.value)} : null)} 
              />
            </div>
            <div className="flex items-center gap-2">
              <Input 
                type="color" className="w-16 h-10 p-1" 
                value={editingProg?.color || "#000"} 
                onChange={e => setEditingProg(prev => prev ? {...prev, color: e.target.value} : null)} 
              />
              <span className="text-sm text-slate-500">Program Color</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProg(null)}>Cancel</Button>
            <Button onClick={() => editingProg && updateProgMutation.mutate(editingProg)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
