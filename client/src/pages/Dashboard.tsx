import { useState, useMemo, useEffect } from "react";
import Fuse from "fuse.js";
import { useSchools, useDeleteSchool } from "@/hooks/use-schools";
import { useReferrals, useCreateReferral, useUpdateReferral, useDeleteReferral } from "@/hooks/use-referrals";
import { useQuery } from "@tanstack/react-query";
import { SchoolFormDialog } from "@/components/SchoolFormDialog";
import { SchoolImportDialog } from "@/components/SchoolImportDialog";
import MapWrapper from "@/components/MapWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, MapPin, MoreVertical, Trash2, Edit,
  GraduationCap, Maximize2, Minimize2, BarChart2,
  UserPlus, Map as MapIcon, Table as TableIcon,
  CheckCircle2, XCircle, ArrowUpDown, Key, MonitorPlay,
  Play, PanelLeftClose, PanelLeftOpen, Pencil,
  Upload, Users, ShieldCheck, Settings2, Database,
  FileSpreadsheet, AlertCircle, TrendingUp, Layers
} from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import type { MapOverlays } from "@/components/MapWrapper";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Form, FormControl, FormDescription, FormField, FormItem,
  FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertReferralSchema, insertStudentSchema,
  type School, type ReferralInput, type Referral, type Student
} from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Textarea } from "@/components/ui/textarea";
import { buildUrl, api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const { data: schools, isLoading: schoolsLoading } = useSchools();
  const { data: referrals, isLoading: referralsLoading } = useReferrals();
  const { data: students } = useQuery<Student[]>({ queryKey: [api.students.list.path] });

  const deleteMutation = useDeleteSchool();
  const createReferralMutation = useCreateReferral();
  const updateReferralMutation = useUpdateReferral();
  const deleteReferralMutation = useDeleteReferral();

  const [search, setSearch] = useState("");
  const [referralSearch, setReferralSearch] = useState("");
  const [referralSort, setReferralSort] = useState<"name" | "status" | "date">("date");
  const [referralStatusFilter, setReferralStatusFilter] = useState("all");
  const [adminRegistrySearch, setAdminRegistrySearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [isPresenting, setIsPresenting] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [addReferralOpen, setAddReferralOpen] = useState(false);
  const [overlays, setOverlays] = useState<MapOverlays>({ showCounts: true, showLabels: true, showDrawings: true });
  const toggleOverlay = (key: keyof MapOverlays) => setOverlays(prev => ({ ...prev, [key]: !prev[key] }));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<"registry" | "import">("registry");
  const [confirmAction, setConfirmAction] = useState<{ id: number; status: string; type: "approve" | "reject" | "delete" } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPresenting) {
        setIsPresenting(false);
        setIsTouring(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPresenting]);

  // Fuse.js smart search
  const fuse = useMemo(() => new Fuse(schools || [], {
    keys: ["name", "municipality", "institutionType"],
    threshold: 0.4,
    minMatchCharLength: 1,
  }), [schools]);

  const filteredSchools = useMemo(() => {
    if (!search.trim()) return schools || [];
    return fuse.search(search).map(r => r.item);
  }, [search, fuse, schools]);

  // Admin registry search
  const adminFuse = useMemo(() => new Fuse(schools || [], {
    keys: ["name", "municipality", "institutionType", "geoStatus"],
    threshold: 0.4,
  }), [schools]);

  const filteredRegistry = useMemo(() => {
    if (!adminRegistrySearch.trim()) return schools || [];
    return adminFuse.search(adminRegistrySearch).map(r => r.item);
  }, [adminRegistrySearch, adminFuse, schools]);

  // Referral stats
  const stats = useMemo(() => {
    const refs = referrals || [];
    return {
      total: refs.length,
      pending: refs.filter(r => r.status === "pending").length,
      approved: refs.filter(r => r.status === "approved").length,
      rejected: refs.filter(r => r.status === "rejected").length,
    };
  }, [referrals]);

  const matchedStudent = useMemo(() => {
    if (!referralSearch || !students) return null;
    const s = referralSearch.toLowerCase();
    return students.find(st =>
      st.name.toLowerCase().includes(s) ||
      st.studentNumber.toLowerCase().includes(s) ||
      st.referralCode.toLowerCase().includes(s)
    );
  }, [referralSearch, students]);

  const sortedReferrals = [...(referrals || [])]
    .filter(r => {
      const matchesSearch = r.referredName.toLowerCase().includes(referralSearch.toLowerCase());
      const matchesStatus = referralStatusFilter === "all" || r.status === referralStatusFilter;
      const isMatchedViaReferrer = matchedStudent && r.referrerId === matchedStudent.id;
      return (matchesSearch || isMatchedViaReferrer) && matchesStatus;
    })
    .sort((a, b) => {
      if (referralSort === "name") return a.referredName.localeCompare(b.referredName);
      if (referralSort === "status") return a.status.localeCompare(b.status);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const totalStudents = useMemo(() => schools?.reduce((s, sc) => s + sc.studentCount, 0) || 0, [schools]);
  const avgPerSchool = useMemo(() => schools?.length ? Math.round(totalStudents / schools.length) : 0, [totalStudents, schools]);

  const handleAddClick = () => { setEditingSchool(null); setSelectedCoords(null); setDialogOpen(true); };
  const handleMapClick = (lat: number, lng: number) => { setEditingSchool(null); setSelectedCoords({ lat, lng }); setDialogOpen(true); };
  const handleEdit = (school: School) => { setSelectedCoords(null); setEditingSchool(school); setDialogOpen(true); };
  const handleDelete = (id: number) => {
    if (confirm("Remove this school mapping?")) deleteMutation.mutate(id);
  };

  const executeReferralAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "delete") {
      deleteReferralMutation.mutate(confirmAction.id);
    } else {
      const targetStatus = confirmAction.status === "approved" ? "approved" : "rejected";
      updateReferralMutation.mutate({ id: confirmAction.id, updates: { status: targetStatus } });
    }
    setConfirmAction(null);
  };

  const referralForm = useForm<ReferralInput & { referralCode?: string }>({
    resolver: zodResolver(insertReferralSchema.extend({ referralCode: insertStudentSchema.shape.referralCode.optional() })),
    defaultValues: { referrerId: undefined, referralCode: "", referredName: "", relationship: "", contactNumber: "", notes: "", status: "pending" }
  });

  const onReferralSubmit = async (data: ReferralInput & { referralCode?: string }) => {
    let referrerId = data.referrerId;
    if (data.referralCode) {
      try {
        const res = await fetch(buildUrl(api.students.getByCode.path, { referralCode: data.referralCode }));
        if (res.ok) {
          const student = await res.json();
          referrerId = student.id;
        } else {
          toast({ variant: "destructive", title: "Invalid Code", description: "Referral code not found." });
          return;
        }
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Could not validate referral code." });
        return;
      }
    }
    const { referralCode, ...submitData } = data;
    createReferralMutation.mutate({ ...submitData, referrerId }, {
      onSuccess: () => { referralForm.reset(); setAddReferralOpen(false); }
    });
  };

  const geoStatusBadge = (status: string | null) => {
    switch (status) {
      case "auto-located": return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-[10px]"><MapPin className="w-3 h-3 mr-1" />Auto-Located</Badge>;
      case "needs-review": return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 text-[10px]"><AlertCircle className="w-3 h-3 mr-1" />Needs Review</Badge>;
      case "missing": return <Badge className="bg-red-500/10 text-red-700 border-red-500/20 text-[10px]"><AlertCircle className="w-3 h-3 mr-1" />Missing</Badge>;
      default: return <Badge className="bg-green-500/10 text-green-700 border-green-500/20 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative">
      <Tabs defaultValue="map" className="flex-1 flex flex-col h-full w-full overflow-hidden">

        {/* Top Navigation */}
        <div className={cn(
          "border-b bg-card z-30 flex-shrink-0 transition-all duration-500",
          isPresenting && "h-0 overflow-hidden border-0"
        )}>
          <div className="flex items-center justify-between px-5 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary p-1.5 rounded-lg">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">Trimex Colleges</h1>
                <p className="text-[10px] text-muted-foreground leading-tight">GIS Admissions Platform</p>
              </div>
            </div>
            <TabsList className="bg-secondary/50 h-8">
              <TabsTrigger value="map" className="gap-1.5 text-xs h-7 px-3">
                <MapIcon className="w-3.5 h-3.5" /> Map
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-1.5 text-xs h-7 px-3">
                <BarChart2 className="w-3.5 h-3.5" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="referral" className="gap-1.5 text-xs h-7 px-3">
                <UserPlus className="w-3.5 h-3.5" /> Referrals
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-1.5 text-xs h-7 px-3">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin Portal
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* ── MAP TAB ── */}
        <TabsContent value="map" className="flex-1 h-full w-full m-0 p-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
          <div className="flex-1 flex flex-row h-full w-full overflow-hidden">

            {/* Sidebar */}
            <div className={cn(
              "w-[340px] flex-shrink-0 flex flex-col border-r border-border bg-card z-20 h-full transition-all duration-500",
              (isPresenting || isSidebarHidden) && "-ml-[340px] opacity-0 pointer-events-none"
            )}>
              {/* Sidebar Header */}
              <div className="p-5 pb-3 border-b border-border bg-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary p-2 rounded-xl border border-primary/20">
                    <GraduationCap className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold leading-tight">Origin Schools</h1>
                    <p className="text-xs text-muted-foreground">Laguna Province · Feeder Map</p>
                  </div>
                </div>

                {/* Full-width Search */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, municipality..."
                    className="pl-9 w-full bg-secondary/40 border-border/60 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Inline Analytics Mini-Cards */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-primary/8 border border-primary/15 rounded-xl p-3 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-primary" />
                      <p className="text-[10px] font-bold text-primary/80 uppercase tracking-wide">Total Enrollees</p>
                    </div>
                    <p className="text-xl font-black text-primary leading-none">{totalStudents.toLocaleString()}</p>
                  </div>
                  <div className="bg-secondary/60 border border-border rounded-xl p-3 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Avg / School</p>
                    </div>
                    <p className="text-xl font-black text-foreground leading-none">{avgPerSchool}</p>
                  </div>
                </div>
              </div>

              {/* School List */}
              <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-1.5">
                  {schoolsLoading
                    ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                    : filteredSchools.length === 0
                      ? <div className="text-center py-8 text-muted-foreground text-sm">No schools found</div>
                      : filteredSchools.map((school) => (
                        <div
                          key={school.id}
                          className="group flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:bg-secondary/40 hover:border-primary/20 transition-all cursor-pointer"
                          onClick={() => handleEdit(school)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="flex items-center justify-center w-9 h-9 rounded-full font-bold text-xs border-2 shrink-0 text-white"
                              style={{
                                backgroundColor: school.studentCount <= 5 ? "#22c55e" : school.studentCount <= 10 ? "#eab308" : "#ef4444",
                                borderColor: school.studentCount <= 5 ? "#16a34a" : school.studentCount <= 10 ? "#ca8a04" : "#dc2626",
                              }}
                            >
                              {school.studentCount}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {school.name}
                              </h4>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {school.municipality || "Laguna"}
                                {school.institutionType && <span className="text-muted-foreground/60 ml-1">· {school.institutionType}</span>}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(school)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(school.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Remove</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))
                  }
                </div>
              </ScrollArea>

              {/* Add School Button at bottom */}
              <div className="p-3 border-t border-border bg-card/80">
                <Button className="w-full gap-2 h-9 text-sm" onClick={handleAddClick}>
                  <Plus className="w-4 h-4" /> Add School
                </Button>
              </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative z-10 h-full w-full overflow-hidden">

              {/* LEFT controls — Map Interaction Tools */}
              <div className="absolute top-4 left-4 z-[1100] flex flex-col gap-2">
                {/* Sidebar toggle — hidden in presentation mode */}
                {!isPresenting && (
                  <button
                    className="h-9 w-9 flex items-center justify-center rounded-xl shadow-lg border bg-white/95 text-gray-700 hover:bg-white border-white/60 hover:shadow-xl backdrop-blur-md transition-all"
                    onClick={() => setIsSidebarHidden(!isSidebarHidden)}
                    title={isSidebarHidden ? "Show sidebar" : "Hide sidebar"}
                  >
                    {isSidebarHidden ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                  </button>
                )}

                {/* Auto-tour — only visible in presentation mode */}
                {isPresenting && (
                  <button
                    className={cn(
                      "h-9 w-9 flex items-center justify-center rounded-xl shadow-lg border backdrop-blur-md transition-all animate-in fade-in",
                      isTouring
                        ? "bg-green-500 text-white border-green-400 shadow-green-200"
                        : "bg-white/95 text-gray-700 hover:bg-white border-white/60 hover:shadow-xl"
                    )}
                    onClick={() => setIsTouring(!isTouring)}
                    title={isTouring ? "Stop auto-tour" : "Start auto-tour"}
                  >
                    <Play className={cn("w-4 h-4", isTouring && "animate-pulse")} />
                  </button>
                )}
              </div>

              {/* RIGHT controls — System Management */}
              <div className="absolute top-4 right-4 z-[1100] flex flex-col gap-2">

                {/* Presentation mode */}
                <button
                  className={cn(
                    "h-9 w-9 flex items-center justify-center rounded-xl shadow-lg border backdrop-blur-md transition-all",
                    isPresenting
                      ? "bg-blue-600 text-white border-blue-500 shadow-blue-200"
                      : "bg-white/95 text-gray-700 hover:bg-white border-white/60 hover:shadow-xl"
                  )}
                  onClick={() => { setIsPresenting(!isPresenting); setIsTouring(false); setIsSidebarHidden(false); }}
                  title={isPresenting ? "Exit presentation (Esc)" : "Presentation mode"}
                >
                  {isPresenting ? <Minimize2 className="w-4 h-4" /> : <MonitorPlay className="w-4 h-4" />}
                </button>

                {/* Settings Sheet trigger */}
                <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <SheetTrigger asChild>
                    <button
                      className={cn(
                        "h-9 w-9 flex items-center justify-center rounded-xl shadow-lg border backdrop-blur-md transition-all",
                        settingsOpen
                          ? "bg-primary text-primary-foreground border-primary/40"
                          : "bg-white/95 text-gray-700 hover:bg-white border-white/60 hover:shadow-xl"
                      )}
                      title="Map settings & overlays"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72 p-0 flex flex-col gap-0 overflow-hidden">
                    <SheetHeader className="p-5 pb-3 border-b shrink-0">
                      <SheetTitle className="flex items-center gap-2 text-sm font-bold">
                        <Settings2 className="w-4 h-4 text-primary" /> Map Settings
                      </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto">

                      {/* Map Overlays */}
                      <div className="p-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Layers className="w-3 h-3" /> Map Overlays
                        </p>
                        {([
                          { key: "showCounts" as const, label: "School Counts", desc: "Count badges on map pins" },
                          { key: "showLabels" as const, label: "School Name Labels", desc: "Name tags beside pins" },
                        ]).map(({ key, label, desc }) => (
                          <div key={key} className="flex items-center justify-between py-2.5">
                            <div>
                              <Label className="text-xs font-semibold cursor-pointer" onClick={() => toggleOverlay(key)}>{label}</Label>
                              <p className="text-[10px] text-muted-foreground">{desc}</p>
                            </div>
                            <Switch checked={overlays[key]} onCheckedChange={() => toggleOverlay(key)} />
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {/* Draw Settings */}
                      <div className="p-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Pencil className="w-3 h-3" /> Draw Settings
                        </p>
                        <div className="flex items-center justify-between py-2.5">
                          <div>
                            <Label className="text-xs font-semibold cursor-pointer" onClick={() => toggleOverlay("showDrawings")}>Enable Drawing</Label>
                            <p className="text-[10px] text-muted-foreground">Show drawing toolbar on map</p>
                          </div>
                          <Switch checked={overlays.showDrawings} onCheckedChange={() => toggleOverlay("showDrawings")} />
                        </div>
                        <div className="flex items-center justify-between py-2.5">
                          <div>
                            <Label className="text-xs font-semibold cursor-pointer" onClick={() => setIsDrawing(!isDrawing)}>Drawing Mode</Label>
                            <p className="text-[10px] text-muted-foreground">Activate the draw toolbar</p>
                          </div>
                          <Switch checked={isDrawing} onCheckedChange={() => setIsDrawing(v => !v)} />
                        </div>
                      </div>

                      <Separator />

                      {/* Analytics Settings */}
                      <div className="p-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <BarChart2 className="w-3 h-3" /> Analytics
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Enrollment stats and school analytics are shown in the sidebar. Switch to the Analytics tab for full charts.
                        </p>
                      </div>

                      <Separator />

                      {/* Presentation Settings */}
                      <div className="p-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <MonitorPlay className="w-3 h-3" /> Presentation
                        </p>
                        <div className="flex items-center justify-between py-2.5">
                          <div>
                            <Label className="text-xs font-semibold cursor-pointer" onClick={() => { setIsPresenting(v => !v); setSettingsOpen(false); }}>Presentation Mode</Label>
                            <p className="text-[10px] text-muted-foreground">Fullscreen immersive GIS view</p>
                          </div>
                          <Switch checked={isPresenting} onCheckedChange={(v) => { setIsPresenting(v); if (!v) setIsTouring(false); setSettingsOpen(false); }} />
                        </div>
                        <div className="flex items-center justify-between py-2.5">
                          <div>
                            <Label className={cn("text-xs font-semibold", !isPresenting && "text-muted-foreground/50")}>Auto-Tour</Label>
                            <p className="text-[10px] text-muted-foreground">Fly between top feeder schools</p>
                          </div>
                          <Switch checked={isTouring} onCheckedChange={setIsTouring} disabled={!isPresenting} />
                        </div>
                      </div>

                      <Separator />

                      {/* System Settings */}
                      <div className="p-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3" /> System
                        </p>
                        <div className="flex items-center justify-between py-2.5">
                          <div>
                            <Label className="text-xs font-semibold cursor-pointer" onClick={() => setIsSidebarHidden(v => !v)}>Hide Sidebar</Label>
                            <p className="text-[10px] text-muted-foreground">Collapse the schools panel</p>
                          </div>
                          <Switch checked={isSidebarHidden} onCheckedChange={setIsSidebarHidden} />
                        </div>
                      </div>

                    </div>
                  </SheetContent>
                </Sheet>

                {/* Draw button — activates drawing toolbar */}
                <button
                  className={cn(
                    "h-9 w-9 flex items-center justify-center rounded-xl shadow-lg border backdrop-blur-md transition-all",
                    isDrawing
                      ? "bg-orange-500 text-white border-orange-400 shadow-orange-200"
                      : "bg-white/95 text-gray-700 hover:bg-white border-white/60 hover:shadow-xl"
                  )}
                  onClick={() => setIsDrawing(!isDrawing)}
                  title={isDrawing ? "Exit drawing mode" : "Drawing tools"}
                >
                  <Pencil className="w-4 h-4" />
                </button>

              </div>

              {/* Presentation mode escape hint */}
              {isPresenting && (
                <div className="absolute bottom-4 right-4 z-[1000] bg-black/40 backdrop-blur-md text-white/70 text-[10px] font-medium px-3 py-1.5 rounded-full border border-white/10">
                  Press <kbd className="font-bold">Esc</kbd> to exit
                </div>
              )}

              <MapWrapper
                onAddSchool={handleMapClick}
                onEditSchool={handleEdit}
                isPresenting={isPresenting}
                isTouring={isTouring}
                isDrawing={isDrawing && overlays.showDrawings}
                onDrawingClose={() => setIsDrawing(false)}
                overlays={overlays}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── ANALYTICS TAB ── */}
        <TabsContent value="stats" className="flex-1 h-full w-full m-0 p-6 overflow-hidden flex flex-col gap-6 data-[state=inactive]:hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase">Mapped Schools</CardTitle></CardHeader><CardContent><div className="text-3xl font-black">{schools?.length || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase">Total Enrollees</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-primary">{totalStudents.toLocaleString()}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase">Top Feeder School</CardTitle></CardHeader><CardContent><div className="text-xl font-bold truncate">{[...(schools || [])].sort((a, b) => b.studentCount - a.studentCount)[0]?.name || "None"}</div></CardContent></Card>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-hidden">
            <Card className="flex flex-col min-h-0 overflow-hidden">
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><BarChart2 className="w-4 h-4 text-primary" /> Enrollment Distribution</CardTitle><CardDescription>Top 10 Schools by Volume</CardDescription></CardHeader>
              <CardContent className="flex-1 min-h-0 p-0 pb-6 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...(schools || [])].sort((a, b) => b.studentCount - a.studentCount).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                    <Bar dataKey="studentCount" radius={[4, 4, 0, 0]}>
                      {(schools || []).map((_, index) => <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.55)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="flex flex-col min-h-0 overflow-hidden">
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><TableIcon className="w-4 h-4 text-primary" /> School Enrollment List</CardTitle><CardDescription>Sorted by enrollment volume</CardDescription></CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School Name</TableHead>
                        <TableHead>Municipality</TableHead>
                        <TableHead className="text-right">Enrollees</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...(schools || [])].sort((a, b) => b.studentCount - a.studentCount).map((school) => (
                        <TableRow key={school.id} className="hover:bg-secondary/30 transition-colors">
                          <TableCell className="font-medium text-sm">{school.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{school.municipality || "—"}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{school.studentCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── REFERRAL TAB ── */}
        <TabsContent value="referral" className="flex-1 h-full w-full m-0 p-6 overflow-hidden flex flex-col gap-5 data-[state=inactive]:hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
            {[
              { label: "Total Referrals", value: stats.total, color: "primary" },
              { label: "Pending", value: stats.pending, color: "muted" },
              { label: "Approved", value: stats.approved, color: "green" },
              { label: "Rejected", value: stats.rejected, color: "red" },
            ].map(({ label, value, color }) => (
              <Card key={label} className={cn(
                color === "green" && "bg-green-500/5 border-green-500/15",
                color === "red" && "bg-destructive/5 border-destructive/15",
                color === "primary" && "bg-primary/5 border-primary/15",
              )}>
                <CardHeader className="p-4 pb-1"><CardTitle className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  color === "primary" && "text-primary",
                  color === "green" && "text-green-600",
                  color === "red" && "text-destructive",
                  color === "muted" && "text-muted-foreground",
                )}>{label}</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className={cn("text-2xl font-black", color === "primary" && "text-primary", color === "green" && "text-green-600", color === "red" && "text-destructive")}>{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex-1 w-full max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search name, number or code..." className="pl-9 text-sm" value={referralSearch} onChange={(e) => setReferralSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Tabs value={referralStatusFilter} onValueChange={setReferralStatusFilter}>
                <TabsList className="h-8">
                  {["all", "pending", "approved", "rejected"].map(s => (
                    <TabsTrigger key={s} value={s} className="text-xs h-7 px-3 capitalize">{s}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Button className="shrink-0 gap-2 h-8 text-xs" onClick={() => setAddReferralOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Referral</Button>
            </div>
          </div>

          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3 px-5">
              <CardTitle className="text-sm font-semibold">Referral Records</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setReferralSort(s => s === "date" ? "name" : s === "name" ? "status" : "date")}>
                <ArrowUpDown className="w-3 h-3" /> {referralSort}
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referred Name</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralsLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                      ))
                      : sortedReferrals.map((referral) => (
                        <TableRow key={referral.id} className="hover:bg-secondary/30 transition-colors text-sm">
                          <TableCell className="font-medium">{referral.referredName}</TableCell>
                          <TableCell className="text-muted-foreground">{referral.relationship}</TableCell>
                          <TableCell className="text-muted-foreground">{referral.contactNumber || "—"}</TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[10px]",
                              referral.status === "approved" && "bg-green-500/10 text-green-700 border-green-500/20",
                              referral.status === "rejected" && "bg-destructive/10 text-destructive border-destructive/20",
                              referral.status === "pending" && "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
                            )}>
                              {referral.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {referral.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                              {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {referral.status === "pending" && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 text-xs" onClick={() => setConfirmAction({ id: referral.id, status: "approved", type: "approve" })}>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs" onClick={() => setConfirmAction({ id: referral.id, status: "rejected", type: "reject" })}>
                                    <XCircle className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-destructive text-xs" onClick={() => setConfirmAction({ id: referral.id, status: "", type: "delete" })}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ADMIN PORTAL TAB ── */}
        <TabsContent value="admin" className="flex-1 h-full w-full m-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
          {/* Admin header bar */}
          <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b bg-card/80">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div>
                <h2 className="text-sm font-bold leading-tight">Admin Portal</h2>
                <p className="text-[11px] text-muted-foreground">School Registry &amp; Data Management</p>
              </div>
            </div>
            {/* Compact stat pills */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-primary/8 border border-primary/15 rounded-lg px-3 py-1.5">
                <Database className="w-3 h-3 text-primary" />
                <span className="text-xs font-bold text-primary">{schools?.length || 0}</span>
                <span className="text-[10px] text-primary/70">Schools</span>
              </div>
              <div className="flex items-center gap-1.5 bg-green-500/8 border border-green-500/15 rounded-lg px-3 py-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span className="text-xs font-bold text-green-700">{schools?.filter(s => !s.geoStatus || s.geoStatus === "verified").length || 0}</span>
                <span className="text-[10px] text-green-600/70">Verified</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-500/8 border border-blue-500/15 rounded-lg px-3 py-1.5">
                <TrendingUp className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">{totalStudents.toLocaleString()}</span>
                <span className="text-[10px] text-blue-600/70">Enrollees</span>
              </div>
            </div>
          </div>

          {/* Admin internal tabs */}
          <div className="flex shrink-0 border-b bg-card px-6">
            {(["registry", "import"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAdminTab(tab)}
                className={cn(
                  "py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors capitalize -mb-px",
                  adminTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "registry" ? "School Registry" : "Import & Upload"}
              </button>
            ))}
          </div>

          {/* Registry Tab */}
          {adminTab === "registry" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 gap-3">
              <div className="flex items-center justify-between gap-3 shrink-0">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name, municipality, type..."
                    className="pl-8 h-8 text-xs"
                    value={adminRegistrySearch}
                    onChange={(e) => setAdminRegistrySearch(e.target.value)}
                  />
                </div>
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAddClick}>
                  <Plus className="w-3.5 h-3.5" /> Add School
                </Button>
              </div>

              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">School Name</TableHead>
                          <TableHead className="text-xs">Municipality</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs text-right">Students</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRegistry.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                              {adminRegistrySearch ? "No matching schools found" : "No schools in registry yet"}
                            </TableCell>
                          </TableRow>
                        ) : filteredRegistry.map((school) => (
                          <TableRow key={school.id} className="hover:bg-secondary/30 transition-colors">
                            <TableCell className="font-medium text-xs max-w-[180px] truncate py-2.5" title={school.name}>{school.name}</TableCell>
                            <TableCell className="text-muted-foreground text-xs py-2.5">{school.municipality || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-xs py-2.5 max-w-[120px] truncate">{school.institutionType || "—"}</TableCell>
                            <TableCell className="text-right font-bold text-primary text-xs py-2.5">{school.studentCount}</TableCell>
                            <TableCell className="py-2.5">{geoStatusBadge(school.geoStatus ?? null)}</TableCell>
                            <TableCell className="text-right py-2.5">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEdit(school)}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(school.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Import Tab */}
          {adminTab === "import" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 gap-4">
              {/* Import action card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
                <Card
                  className="cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition-all group col-span-2 md:col-span-1"
                  onClick={() => setImportOpen(true)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-primary/10 rounded-xl p-2.5 group-hover:bg-primary/20 transition-colors shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Bulk Import</p>
                      <p className="text-xs text-muted-foreground">Upload .xlsx, .csv, or .json</p>
                    </div>
                    <Upload className="w-4 h-4 text-primary/40 ml-auto" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-blue-500/10 rounded-xl p-2.5 shrink-0">
                      <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{schools?.length || 0} Schools</p>
                      <p className="text-xs text-muted-foreground">In registry</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-green-500/10 rounded-xl p-2.5 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{schools?.filter(s => !s.geoStatus || s.geoStatus === "verified").length || 0} Verified</p>
                      <p className="text-xs text-muted-foreground">GPS confirmed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Expected format guide */}
              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardHeader className="py-3 px-5 border-b shrink-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-primary" /> Expected File Format
                  </CardTitle>
                  <CardDescription className="text-xs">Required columns for bulk school import</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-5 space-y-4">
                      <div className="rounded-xl border border-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              {["School Name", "Municipality", "Institution Type", "Latitude", "Longitude", "Student Count"].map(h => (
                                <TableHead key={h} className="text-[10px] font-bold uppercase tracking-wide py-2">{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[
                              ["Lumban National HS", "Lumban", "Public High School", "14.2971", "121.4590", "120"],
                              ["Paete NHS", "Paete", "Public High School", "", "", "85"],
                              ["Holy Cross College", "Sta. Cruz", "Private College w/ SHS", "14.2813", "121.4173", "200"],
                            ].map((row, i) => (
                              <TableRow key={i} className="text-xs">
                                {row.map((cell, j) => (
                                  <TableCell key={j} className={cn("py-2", !cell && "text-muted-foreground/40 italic")}>
                                    {cell || "auto-detect"}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, title: "Coordinates Provided", desc: "School is instantly pinned on the map — no API calls needed." },
                          { icon: <MapPin className="w-4 h-4 text-blue-600" />, title: "No Coordinates", desc: "System auto-locates using Nominatim geocoding API (rate-limited)." },
                          { icon: <AlertCircle className="w-4 h-4 text-yellow-600" />, title: "Duplicate Detection", desc: "Fuse.js fuzzy matching removes duplicates automatically." },
                          { icon: <Database className="w-4 h-4 text-primary" />, title: "Saved Permanently", desc: "All verified coordinates are stored — never re-fetched." },
                        ].map(({ icon, title, desc }) => (
                          <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
                            <div className="shrink-0 mt-0.5">{icon}</div>
                            <div>
                              <p className="text-xs font-semibold">{title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-center pt-2">
                        <Button className="gap-2" onClick={() => setImportOpen(true)}>
                          <Upload className="w-4 h-4" /> Start Import
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── DIALOGS ── */}
      <SchoolFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editingSchool}
        defaultCoordinates={selectedCoords}
      />

      <SchoolImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Referral Form Dialog */}
      <Dialog open={addReferralOpen} onOpenChange={setAddReferralOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Add Referral</DialogTitle>
            <DialogDescription>Record a new student referral.</DialogDescription>
          </DialogHeader>
          <Form {...referralForm}>
            <form onSubmit={referralForm.handleSubmit(onReferralSubmit)} className="space-y-4">
              <FormField control={referralForm.control} name="referralCode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" />Referral Code</FormLabel>
                  <FormControl><Input placeholder="TRX-XXXXXX" {...field} /></FormControl>
                  <FormDescription className="text-xs">Student referral code (optional)</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={referralForm.control} name="referredName" render={({ field }) => (
                <FormItem><FormLabel>Referred Person's Name</FormLabel><FormControl><Input placeholder="Full name..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={referralForm.control} name="relationship" render={({ field }) => (
                <FormItem><FormLabel>Relationship</FormLabel><FormControl><Input placeholder="e.g. Friend, Sibling, Classmate" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={referralForm.control} name="contactNumber" render={({ field }) => (
                <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="09XX-XXX-XXXX" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={referralForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Additional notes..." className="resize-none" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddReferralOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createReferralMutation.isPending}>
                  {createReferralMutation.isPending ? "Saving..." : "Submit Referral"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "delete" ? <Trash2 className="w-5 h-5 text-destructive" /> : confirmAction?.type === "approve" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-destructive" />}
              {confirmAction?.type === "delete" ? "Delete Referral" : confirmAction?.type === "approve" ? "Approve Referral" : "Reject Referral"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "delete" ? "This will permanently remove this referral." : `This will mark the referral as ${confirmAction?.type}d.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              variant={confirmAction?.type === "approve" ? "default" : "destructive"}
              onClick={executeReferralAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
