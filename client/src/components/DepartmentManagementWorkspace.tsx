import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Search,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Target,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Department, Program } from "@shared/schema";

const PRESET_COLORS = [
  { name: "Crimson", hex: "#dc2626" },
  { name: "Royal Blue", hex: "#2563eb" },
  { name: "Emerald", hex: "#059669" },
  { name: "Amber Gold", hex: "#d97706" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Cyan Teal", hex: "#0891b2" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Slate", hex: "#475569" },
];

export function DepartmentManagementWorkspace() {
  const { toast } = useToast();

  const { data: departments = [], isLoading: isLoadingDepts } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: programs = [], isLoading: isLoadingProgs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  // State
  const [search, setSearch] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Set<number>>(new Set());

  // Department modal state
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptFormCode, setDeptFormCode] = useState("");
  const [deptFormName, setDeptFormName] = useState("");
  const [deptFormColor, setDeptFormColor] = useState("#2563eb");
  const [deptFormTarget, setDeptFormTarget] = useState<number>(0);

  // Program modal state
  const [progDialogOpen, setProgDialogOpen] = useState(false);
  const [editingProg, setEditingProg] = useState<Program | null>(null);
  const [progFormDeptId, setProgFormDeptId] = useState<number | "">("");
  const [progFormCode, setProgFormCode] = useState("");
  const [progFormName, setProgFormName] = useState("");
  const [progFormTrack, setProgFormTrack] = useState("");
  const [progFormColor, setProgFormColor] = useState("#2563eb");
  const [progFormTarget, setProgFormTarget] = useState<number>(0);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "department" | "program"; id: number; name: string } | null>(null);

  // Mutations
  const saveDeptMutation = useMutation({
    mutationFn: async (payload: { id?: number; code: string; name: string; color: string; targetValue: number }) => {
      const res = await apiRequest("POST", "/api/departments", payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to save department" }));
        throw new Error(err.message || "Failed to save department");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: editingDept ? "Department updated" : "Department created successfully" });
      setDeptDialogOpen(false);
      setEditingDept(null);
    },
    onError: (e: any) => toast({ title: "Error saving department", description: e.message || String(e), variant: "destructive" }),
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/departments/${id}`);
      if (!res.ok) throw new Error("Failed to delete department");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Department and its programs deleted" });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast({ title: "Error deleting department", description: e.message || String(e), variant: "destructive" }),
  });

  const saveProgMutation = useMutation({
    mutationFn: async (payload: { id?: number; departmentId: number; code: string; name: string; track?: string; color: string; targetValue: number }) => {
      const res = await apiRequest("POST", "/api/programs", payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to save program" }));
        throw new Error(err.message || "Failed to save program");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: editingProg ? "Program updated" : "Program added successfully" });
      setProgDialogOpen(false);
      setEditingProg(null);
    },
    onError: (e: any) => toast({ title: "Error saving program", description: e.message || String(e), variant: "destructive" }),
  });

  const deleteProgMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/programs/${id}`);
      if (!res.ok) throw new Error("Failed to delete program");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Program deleted successfully" });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast({ title: "Error deleting program", description: e.message || String(e), variant: "destructive" }),
  });

  // Modal open helpers
  const openAddDept = () => {
    setEditingDept(null);
    setDeptFormCode("");
    setDeptFormName("");
    setDeptFormColor(PRESET_COLORS[departments.length % PRESET_COLORS.length].hex);
    setDeptFormTarget(0);
    setDeptDialogOpen(true);
  };

  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptFormCode(dept.code);
    setDeptFormName(dept.name);
    setDeptFormColor(dept.color);
    setDeptFormTarget(dept.targetValue || 0);
    setDeptDialogOpen(true);
  };

  const openAddProg = (preselectedDeptId?: number) => {
    setEditingProg(null);
    const chosenDeptId = preselectedDeptId || (departments[0]?.id ?? "");
    setProgFormDeptId(chosenDeptId);
    const chosenDept = departments.find((d) => d.id === chosenDeptId);
    setProgFormCode("");
    setProgFormName("");
    setProgFormTrack("");
    setProgFormColor(chosenDept?.color || "#2563eb");
    setProgFormTarget(0);
    setProgDialogOpen(true);
  };

  const openEditProg = (prog: Program) => {
    setEditingProg(prog);
    setProgFormDeptId(prog.departmentId);
    setProgFormCode(prog.code);
    setProgFormName(prog.name);
    setProgFormTrack(prog.track || "");
    setProgFormColor(prog.color);
    setProgFormTarget(prog.targetValue || 0);
    setProgDialogOpen(true);
  };

  const toggleDeptExpanded = (id: number) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllExpanded = () => {
    if (expandedDepts.size === departments.length) {
      setExpandedDepts(new Set());
    } else {
      setExpandedDepts(new Set(departments.map((d) => d.id)));
    }
  };

  // Filtered departments
  const filteredDepts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;

    return departments.filter((d) => {
      const deptMatches = d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
      const progMatches = programs.some(
        (p) => p.departmentId === d.id && (p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)),
      );
      return deptMatches || progMatches;
    });
  }, [departments, programs, search]);

  // Aggregate metrics
  const totalTargets = useMemo(() => {
    return departments.reduce((sum, d) => sum + (d.targetValue || 0), 0);
  }, [departments]);

  if (isLoadingDepts || isLoadingProgs) {
    return (
      <div className="flex h-96 w-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs font-semibold">Loading Department & Program Directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Department Management</h2>
              <p className="text-xs text-muted-foreground">
                Configure academic departments, programs, target quotas, and GIS map color themes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => openAddProg()}
            variant="outline"
            className="h-9 gap-1.5 rounded-xl border-border/60 bg-muted/30 px-3.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/60 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Program
          </Button>

          <Button
            onClick={openAddDept}
            className="h-9 gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Department
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-2xl border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Departments</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-foreground">{departments.length}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Active Academic Units</p>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Degree Programs</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-foreground">{programs.length}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Recognized Programs</p>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Enrollee Quota</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-foreground">{totalTargets.toLocaleString()}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Overall Target Students</p>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Avg Target / Dept</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-foreground">
            {departments.length > 0 ? Math.round(totalTargets / departments.length).toLocaleString() : 0}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Per Academic Department</p>
        </Card>
      </div>

      {/* Search and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments, programs, or codes..."
            className="h-10 pl-10 rounded-xl border-border/60 bg-card/80 text-foreground text-xs shadow-sm backdrop-blur-md focus-visible:ring-primary/20 placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAllExpanded}
            className="h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            {expandedDepts.size === departments.length ? "Collapse All" : "Expand All"}
          </Button>
        </div>
      </div>

      {/* Main Department List */}
      <div className="flex flex-col gap-4">
        {filteredDepts.length === 0 ? (
          <Card className="rounded-2xl border-border/60 bg-card/80 p-12 text-center shadow-sm backdrop-blur-xl">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-3 text-base font-bold text-foreground">No departments found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {search ? "No departments or programs match your search criteria." : "Get started by adding your first academic department."}
            </p>
            {!search && (
              <Button onClick={openAddDept} className="mt-4 h-9 gap-1.5 rounded-xl bg-primary text-xs font-semibold">
                <Plus className="h-3.5 w-3.5" />
                Add Department
              </Button>
            )}
          </Card>
        ) : (
          filteredDepts.map((dept) => {
            const deptPrograms = programs.filter((p) => p.departmentId === dept.id);
            const isExpanded = expandedDepts.has(dept.id) || Boolean(search);

            return (
              <Card
                key={dept.id}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md"
              >
                {/* Department Header Row */}
                <div
                  onClick={() => toggleDeptExpanded(dept.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    <div
                      className="h-4 w-4 shrink-0 rounded-full shadow-sm ring-2 ring-background"
                      style={{ backgroundColor: dept.color }}
                    />

                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant="outline"
                        className="font-bold text-xs px-2.5 py-0.5 rounded-lg border-border/60 bg-muted/60 text-foreground shadow-2xs"
                      >
                        {dept.code}
                      </Badge>
                      <h4 className="font-bold text-sm text-foreground truncate">{dept.name}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground font-medium">
                      <Target className="h-3 w-3 text-emerald-400" />
                      <span>Target: <strong className="text-foreground">{dept.targetValue.toLocaleString()}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground font-medium">
                      <GraduationCap className="h-3 w-3 text-indigo-400" />
                      <span>{deptPrograms.length} {deptPrograms.length === 1 ? "Program" : "Programs"}</span>
                    </div>

                    <div className="flex items-center gap-1 pl-2 border-l border-border/40" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Add Program to this department"
                        onClick={() => openAddProg(dept.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                        title="Edit Department"
                        onClick={() => openEditDept(dept)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Department"
                        onClick={() => setDeleteTarget({ type: "department", id: dept.id, name: `${dept.code} - ${dept.name}` })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Programs Section */}
                {isExpanded && (
                  <div className="bg-muted/20 p-3 sm:p-5 border-t border-border/40">
                    {deptPrograms.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-6 text-center">
                        <p className="text-xs text-muted-foreground">No degree programs assigned to this department yet.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddProg(dept.id)}
                          className="mt-2.5 h-8 gap-1.5 rounded-lg text-xs font-semibold border-border/60 bg-muted/30 text-foreground hover:bg-muted/60"
                        >
                          <Plus className="h-3 w-3" />
                          Add Program to {dept.code}
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xs">
                        <Table>
                          <TableHeader className="bg-muted/40 border-b border-border/40">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[140px] text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Program Code</TableHead>
                              <TableHead className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Program Name</TableHead>
                              <TableHead className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Track / Major</TableHead>
                              <TableHead className="text-right text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Target Quota</TableHead>
                              <TableHead className="w-[100px] text-right text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deptPrograms.map((prog) => (
                              <TableRow key={prog.id} className="hover:bg-muted/30 transition-colors border-b border-border/30">
                                <TableCell className="font-semibold text-xs py-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-2.5 w-2.5 shrink-0 rounded-full shadow-2xs"
                                      style={{ backgroundColor: prog.color || dept.color }}
                                    />
                                    <span className="font-mono text-foreground font-bold">{prog.code}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-medium text-foreground py-3">{prog.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground py-3">{prog.track || "—"}</TableCell>
                                <TableCell className="text-right text-xs font-semibold text-foreground py-3 tabular-nums">
                                  {prog.targetValue ? prog.targetValue.toLocaleString() : "0"}
                                </TableCell>
                                <TableCell className="text-right py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-md text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                                      title="Edit Program"
                                      onClick={() => openEditProg(prog)}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                      title="Delete Program"
                                      onClick={() => setDeleteTarget({ type: "program", id: prog.id, name: `${prog.code} - ${prog.name}` })}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Department Dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl p-6 border-border/60 bg-card text-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {editingDept ? "Edit Department" : "Add New Department"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Departments represent college academic divisions and define color themes across the map.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Department Code</Label>
              <Input
                placeholder="e.g. CCS, CBA, COE"
                value={deptFormCode}
                onChange={(e) => setDeptFormCode(e.target.value.toUpperCase())}
                className="h-10 rounded-xl border-border/60 bg-muted/30 text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Department Full Name</Label>
              <Input
                placeholder="e.g. College of Computer Studies"
                value={deptFormName}
                onChange={(e) => setDeptFormName(e.target.value)}
                className="h-10 rounded-xl border-border/60 bg-muted/30 text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Target Enrollee Quota</Label>
              <Input
                type="number"
                placeholder="e.g. 500"
                value={deptFormTarget || ""}
                onChange={(e) => setDeptFormTarget(Number(e.target.value) || 0)}
                className="h-10 rounded-xl border-border/60 bg-muted/30 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Brand Color Theme</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setDeptFormColor(c.hex)}
                    className={cn(
                      "group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all",
                      deptFormColor.toLowerCase() === c.hex.toLowerCase()
                        ? "border-primary bg-primary/20 text-foreground shadow-sm font-semibold"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span className="h-3 w-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: c.hex }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="color"
                  value={deptFormColor}
                  onChange={(e) => setDeptFormColor(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-border/60 bg-transparent p-1"
                />
                <Input
                  value={deptFormColor}
                  onChange={(e) => setDeptFormColor(e.target.value)}
                  placeholder="#2563eb"
                  className="h-9 w-32 font-mono text-xs rounded-xl border-border/60 bg-muted/30 text-foreground"
                />
                <span className="text-xs text-muted-foreground">Custom hex color</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)} className="rounded-xl text-xs border-border/60 bg-muted/30 text-foreground hover:bg-muted/60">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!deptFormCode.trim() || !deptFormName.trim()) {
                  toast({ title: "Please fill in Code and Name", variant: "destructive" });
                  return;
                }
                saveDeptMutation.mutate({
                  id: editingDept?.id,
                  code: deptFormCode.trim(),
                  name: deptFormName.trim(),
                  color: deptFormColor,
                  targetValue: deptFormTarget,
                });
              }}
              disabled={saveDeptMutation.isPending}
              className="rounded-xl text-xs font-semibold bg-primary"
            >
              {saveDeptMutation.isPending ? "Saving..." : editingDept ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Program Dialog */}
      <Dialog open={progDialogOpen} onOpenChange={setProgDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl p-6 border-border/60 bg-card text-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-400" />
              {editingProg ? "Edit Degree Program" : "Add Degree Program"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Degree programs are nested under academic departments with specialized tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Department</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-xl border border-border/60 bg-muted/30 text-foreground px-3 py-2 text-xs shadow-2xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={progFormDeptId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setProgFormDeptId(id);
                  const selectedDept = departments.find((d) => d.id === id);
                  if (selectedDept && !editingProg) {
                    setProgFormColor(selectedDept.color);
                  }
                }}
              >
                <option value="" disabled className="bg-card text-muted-foreground">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} className="bg-card text-foreground">
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Program Code</Label>
              <Input
                placeholder="e.g. BSCS, BSIT, BSA"
                value={progFormCode}
                onChange={(e) => setProgFormCode(e.target.value.toUpperCase())}
                className="h-10 rounded-xl border-border/60 bg-muted/30 text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Program Full Name</Label>
              <Input
                placeholder="e.g. Bachelor of Science in Computer Science"
                value={progFormName}
                onChange={(e) => setProgFormName(e.target.value)}
                className="h-10 rounded-xl border-border/60 bg-muted/30 text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Track / Specialization (Optional)</Label>
              <Input
                placeholder="e.g. Software Engineering, Cybersecurity"
                value={progFormTrack}
                onChange={(e) => setProgFormTrack(e.target.value)}
                className="h-10 rounded-xl border-border/60 bg-muted/30 text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Target Enrollee Quota</Label>
              <Input
                type="number"
                placeholder="e.g. 150"
                value={progFormTarget || ""}
                onChange={(e) => setProgFormTarget(Number(e.target.value) || 0)}
                className="h-10 rounded-xl border-border/60 bg-muted/30 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Program Pin Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={progFormColor}
                  onChange={(e) => setProgFormColor(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-border/60 bg-transparent p-1"
                />
                <Input
                  value={progFormColor}
                  onChange={(e) => setProgFormColor(e.target.value)}
                  placeholder="#2563eb"
                  className="h-9 w-32 font-mono text-xs rounded-xl border-border/60 bg-muted/30 text-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const parentDept = departments.find((d) => d.id === progFormDeptId);
                    if (parentDept) setProgFormColor(parentDept.color);
                  }}
                  className="h-9 rounded-xl text-xs font-semibold border-border/60 bg-muted/30 text-foreground hover:bg-muted/60"
                >
                  Match Department Color
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
            <Button variant="outline" onClick={() => setProgDialogOpen(false)} className="rounded-xl text-xs border-border/60 bg-muted/30 text-foreground hover:bg-muted/60">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!progFormDeptId || !progFormCode.trim() || !progFormName.trim()) {
                  toast({ title: "Please fill in all required fields", variant: "destructive" });
                  return;
                }
                saveProgMutation.mutate({
                  id: editingProg?.id,
                  departmentId: Number(progFormDeptId),
                  code: progFormCode.trim(),
                  name: progFormName.trim(),
                  track: progFormTrack.trim() || undefined,
                  color: progFormColor,
                  targetValue: progFormTarget,
                });
              }}
              disabled={saveProgMutation.isPending}
              className="rounded-xl text-xs font-semibold bg-primary"
            >
              {saveProgMutation.isPending ? "Saving..." : editingProg ? "Save Changes" : "Add Program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-6 border-border/60 bg-card text-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-2">
              Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong>?
              {deleteTarget?.type === "department" && (
                <span className="block mt-2 text-rose-400 font-medium">
                  Warning: Deleting this department will also delete all programs associated with it!
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-xl text-xs border-border/60 bg-muted/30 text-foreground hover:bg-muted/60">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "department") {
                  deleteDeptMutation.mutate(deleteTarget.id);
                } else {
                  deleteProgMutation.mutate(deleteTarget.id);
                }
              }}
              disabled={deleteDeptMutation.isPending || deleteProgMutation.isPending}
              className="rounded-xl text-xs font-bold"
            >
              {deleteDeptMutation.isPending || deleteProgMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
