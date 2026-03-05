import { useState, useMemo, useEffect } from "react";
import { useSchools, useDeleteSchool } from "@/hooks/use-schools";
import { useReferrals, useCreateReferral, useUpdateReferral, useDeleteReferral } from "@/hooks/use-referrals";
import { useQuery } from "@tanstack/react-query";
import { SchoolFormDialog } from "@/components/SchoolFormDialog";
import MapWrapper from "@/components/MapWrapper";
import { MapLegend } from "@/components/MapLegend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  MapPin, 
  MoreVertical, 
  Trash2, 
  Edit,
  GraduationCap,
  Maximize2,
  Minimize2,
  BarChart2,
  UserPlus,
  Map as MapIcon,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  History,
  Info,
  Key,
  MonitorPlay,
  Play
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReferralSchema, insertStudentSchema, type School, type ReferralInput, type Referral, type Student } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isTouring, setIsTouring] = useState(false);

  const [addReferralOpen, setAddReferralOpen] = useState(false);
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

  const filteredSchools = schools?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Referral Stats
  const stats = useMemo(() => {
    const refs = referrals || [];
    return {
      total: refs.length,
      pending: refs.filter(r => r.status === "pending").length,
      approved: refs.filter(r => r.status === "approved").length,
      rejected: refs.filter(r => r.status === "rejected").length,
    };
  }, [referrals]);

  // Enhanced search for student name, student number, or referral code
  const matchedStudent = useMemo(() => {
    if (!referralSearch || !students) return null;
    const s = referralSearch.toLowerCase();
    return students.find(student => 
      student.name.toLowerCase().includes(s) || 
      student.studentNumber.toLowerCase().includes(s) || 
      student.referralCode.toLowerCase().includes(s)
    );
  }, [referralSearch, students]);

  const studentReferrals = useMemo(() => {
    if (!matchedStudent || !referrals) return [];
    return referrals.filter(r => r.referrerId === matchedStudent.id);
  }, [matchedStudent, referrals]);

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

  const handleAddClick = () => {
    setEditingSchool(null);
    setSelectedCoords(null);
    setDialogOpen(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setEditingSchool(null);
    setSelectedCoords({ lat, lng });
    setDialogOpen(true);
  };

  const handleEdit = (school: School) => {
    setSelectedCoords(null);
    setEditingSchool(school);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this school mapping?")) {
      deleteMutation.mutate(id);
    }
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
    defaultValues: {
      referrerId: undefined,
      referralCode: "",
      referredName: "",
      relationship: "",
      contactNumber: "",
      notes: "",
      status: "pending"
    }
  });

  const onReferralSubmit = async (data: ReferralInput & { referralCode?: string }) => {
    let referrerId = data.referrerId;
    
    // Logic: If referralCode is entered, find the student account
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
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Could not validate referral code." });
        return;
      }
    }

    const { referralCode, ...submitData } = data;
    createReferralMutation.mutate({ ...submitData, referrerId }, {
      onSuccess: () => {
        referralForm.reset();
        setAddReferralOpen(false);
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative border-0 m-0 p-0">
      <Tabs defaultValue="map" className="flex-1 flex flex-col h-full w-full overflow-hidden m-0 p-0">
        <div className={cn("border-b bg-card z-30 transition-all duration-500 flex-shrink-0", isPresenting && "h-0 overflow-hidden border-0 p-0")}>
          <div className="flex items-center justify-between px-6 py-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Trimex Student Mapping</h1>
            </div>
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="map" className="gap-2"><MapIcon className="w-4 h-4" /> Map View</TabsTrigger>
              <TabsTrigger value="stats" className="gap-2"><BarChart2 className="w-4 h-4" /> Stats & List</TabsTrigger>
              <TabsTrigger value="referral" className="gap-2"><UserPlus className="w-4 h-4" /> Referral System</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative border-0 m-0 p-0">
          <TabsContent value="map" className="flex-1 h-full w-full m-0 p-0 overflow-hidden relative border-0 flex flex-col data-[state=inactive]:hidden">
            <div className="flex-1 flex flex-col md:flex-row h-full w-full overflow-hidden relative">
              <div className={cn(
                "w-full md:w-[400px] flex-shrink-0 flex flex-col border-r border-border bg-card shadow-xl z-20 h-full transition-all duration-500",
                isPresenting && "md:-ml-[400px] opacity-0 pointer-events-none"
              )}>
                <div className="p-6 pb-4 border-b border-border bg-card/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-primary p-2.5 rounded-xl shadow-inner border border-primary/20">
                      <GraduationCap className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-xl font-display font-bold leading-tight truncate">Trimex Origins</h1>
                      <p className="text-sm text-muted-foreground">Laguna Student Tracking</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Search schools..." className="pl-9 bg-secondary/50" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Button size="icon" onClick={handleAddClick}><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {schoolsLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />) : 
                      filteredSchools.map((school) => (
                        <div key={school.id} className="group flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-secondary/30 transition-all cursor-pointer" onClick={() => handleEdit(school)}>
                          <div className="flex items-center gap-4 flex-1 min-w-0 pr-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20 shrink-0">{school.studentCount}</div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{school.name}</h4>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> Laguna</p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(school)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(school.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Remove</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex-1 relative z-10 h-full w-full bg-background overflow-hidden flex flex-col m-0 p-0 border-0">
                <div className="absolute top-6 left-6 z-[1100] flex gap-2">
                  <Button 
                    size="icon" 
                    variant={isPresenting ? "destructive" : "secondary"} 
                    className="shadow-xl border border-border/50 bg-background/80 backdrop-blur-md hover-elevate" 
                    onClick={() => {
                      setIsPresenting(!isPresenting);
                      setIsTouring(false);
                    }}
                  >
                    {isPresenting ? <Minimize2 className="w-5 h-5" /> : <MonitorPlay className="w-5 h-5" />}
                  </Button>
                  {isPresenting && (
                    <Button 
                      size="icon" 
                      variant={isTouring ? "destructive" : "secondary"} 
                      className="shadow-xl border border-border/50 bg-background/80 backdrop-blur-md animate-in fade-in slide-in-from-left-4" 
                      onClick={() => setIsTouring(!isTouring)}
                    >
                      <Play className={cn("w-5 h-5", isTouring && "animate-pulse")} />
                    </Button>
                  )}
                </div>
                
                <div className="flex-1 w-full h-full relative overflow-hidden m-0 p-0 border-0">
                  <MapWrapper 
                    onAddSchool={handleMapClick} 
                    onEditSchool={handleEdit} 
                    isPresenting={isPresenting}
                    isTouring={isTouring}
                  />
                  {!isPresenting && <MapLegend />}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="flex-1 h-full w-full m-0 p-6 overflow-hidden flex flex-col gap-6 data-[state=inactive]:hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Mapped Schools</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{schools?.length || 0}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Enrollees</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-primary">{schools?.reduce((sum, s) => sum + s.studentCount, 0).toLocaleString() || 0}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase">Top Feeder</CardTitle></CardHeader><CardContent><div className="text-xl font-bold truncate">{[...(schools || [])].sort((a,b) => b.studentCount - a.studentCount)[0]?.name || "None"}</div></CardContent></Card>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-hidden">
              <Card className="flex flex-col min-h-0 overflow-hidden">
                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 className="w-5 h-5 text-primary" /> Enrollment Distribution</CardTitle><CardDescription>Top 10 Schools by Student Volume</CardDescription></CardHeader>
                <CardContent className="flex-1 min-h-0 p-0 pb-6 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...(schools || [])].sort((a,b) => b.studentCount - a.studentCount).slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" hide /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }} />
                      <Bar dataKey="studentCount" radius={[4, 4, 0, 0]}>
                        {(schools || []).map((_, index) => <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.6)'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="flex flex-col min-h-0 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><TableIcon className="w-5 h-5 text-primary" /> Origin Schools List</CardTitle><CardDescription>Detailed breakdown of enrollment numbers</CardDescription></div></CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full px-6">
                    <Table>
                      <TableHeader><TableRow><TableHead>School Name</TableHead><TableHead className="text-right">Enrollees</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {[...(schools || [])].sort((a,b) => b.studentCount - a.studentCount).map((school) => (
                          <TableRow key={school.id} className="hover:bg-secondary/30 transition-colors"><TableCell className="font-medium">{school.name}</TableCell><TableCell className="text-right font-bold text-primary">{school.studentCount}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="referral" className="flex-1 h-full w-full m-0 p-6 overflow-hidden flex flex-col gap-6 data-[state=inactive]:hidden">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              <Card className="bg-primary/5 border-primary/10">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-primary uppercase">Total Referrals</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0"><div className="text-2xl font-black">{stats.total}</div></CardContent>
              </Card>
              <Card className="bg-muted border-muted">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase">Pending</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0"><div className="text-2xl font-black">{stats.pending}</div></CardContent>
              </Card>
              <Card className="bg-green-500/5 border-green-500/10">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-green-600 uppercase">Approved</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0"><div className="text-2xl font-black text-green-600">{stats.approved}</div></CardContent>
              </Card>
              <Card className="bg-destructive/5 border-destructive/10">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-destructive uppercase">Rejected</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0"><div className="text-2xl font-black text-destructive">{stats.rejected}</div></CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex-1 w-full max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search name, number or code..." className="pl-9" value={referralSearch} onChange={(e) => setReferralSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Tabs value={referralStatusFilter} onValueChange={setReferralStatusFilter} className="w-full md:w-auto">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button className="shrink-0 gap-2" onClick={() => setAddReferralOpen(true)}><Plus className="w-4 h-4" /> Add Referral</Button>
              </div>
            </div>

            <Card className="flex-1 flex flex-col min-h-0 hover-elevate transition-all overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl"><UserPlus className="w-5 h-5 text-primary" /> Referral Management</CardTitle>
                  <CardDescription>Manage and track all student referrals</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setReferralSort("name")} className={cn(referralSort === "name" && "bg-primary/10")}><ArrowUpDown className="w-3 h-3 mr-1" /> Name</Button>
                  <Button variant="ghost" size="sm" onClick={() => setReferralSort("date")} className={cn(referralSort === "date" && "bg-primary/10")}><ArrowUpDown className="w-3 h-3 mr-1" /> Date</Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                {matchedStudent && (
                  <div className="p-6 bg-primary/5 border-b border-primary/10">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 p-3 rounded-full"><Info className="w-6 h-6 text-primary" /></div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">Referrer Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                          <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Student Name</p><p className="font-semibold">{matchedStudent.name}</p></div>
                          <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Student ID</p><p className="font-mono text-sm">{matchedStudent.studentNumber}</p></div>
                          <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Referral Code</p><p className="font-mono text-sm text-primary font-bold">{matchedStudent.referralCode}</p></div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-primary/10">
                          <h4 className="font-bold text-sm flex items-center gap-2 mb-3"><History className="w-4 h-4" /> Referrals by {matchedStudent.name}</h4>
                          <div className="space-y-2">
                            {studentReferrals.length === 0 ? <p className="text-xs text-muted-foreground italic">No candidates referred yet.</p> : 
                              studentReferrals.map(r => (
                                <div key={r.id} className="flex items-center justify-between text-sm p-2 bg-card rounded-lg border border-border/50">
                                  <div><span className="font-bold">{r.referredName}</span> <span className="text-muted-foreground mx-2">•</span> <span className="text-xs text-muted-foreground">{r.relationship}</span></div>
                                  <div className="flex items-center gap-3">
                                    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", r.status === "approved" ? "bg-green-500/10 text-green-600" : r.status === "rejected" ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground")}>{r.status}</span>
                                    <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt || "").toLocaleDateString()}</span>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Relationship</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Referrer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralsLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell></TableRow>) : 
                        sortedReferrals.length === 0 ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No referrals found matching the criteria.</TableCell></TableRow> :
                        sortedReferrals.map((ref) => {
                          const referrer = students?.find(s => s.id === ref.referrerId);
                          return (
                            <TableRow key={ref.id} className="hover:bg-secondary/30 transition-colors">
                              <TableCell className="font-bold">{ref.referredName}</TableCell>
                              <TableCell>{ref.relationship}</TableCell>
                              <TableCell>{ref.contactNumber}</TableCell>
                              <TableCell>
                                {referrer ? (
                                  <div className="text-xs">
                                    <p className="font-semibold">{referrer.name}</p>
                                    <p className="text-muted-foreground font-mono">{referrer.referralCode}</p>
                                  </div>
                                ) : "System"}
                              </TableCell>
                              <TableCell>
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  ref.status === 'approved' ? "bg-green-500/10 text-green-600" : 
                                  ref.status === 'rejected' ? "bg-red-500/10 text-red-600" :
                                  "bg-muted text-muted-foreground"
                                )}>
                                  {ref.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {ref.status === 'pending' && (
                                    <>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-500/10" onClick={() => setConfirmAction({ id: ref.id, status: 'approved', type: 'approve' })} title="Approve"><CheckCircle2 className="h-4 w-4" /></Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-500/10" onClick={() => setConfirmAction({ id: ref.id, status: 'rejected', type: 'reject' })} title="Reject"><XCircle className="h-4 w-4" /></Button>
                                    </>
                                  )}
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmAction({ id: ref.id, status: '', type: 'delete' })} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Referral Add Modal */}
      <Dialog open={addReferralOpen} onOpenChange={setAddReferralOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Add New Referral</DialogTitle><DialogDescription>Directly register a new student candidate.</DialogDescription></DialogHeader>
          <Form {...referralForm}>
            <form onSubmit={referralForm.handleSubmit(onReferralSubmit)} className="space-y-4 pt-4">
              <FormField control={referralForm.control} name="referredName" render={({ field }) => (
                <FormItem><FormLabel>Candidate Name</FormLabel><FormControl><Input placeholder="Full Name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={referralForm.control} name="relationship" render={({ field }) => (
                <FormItem><FormLabel>Relationship</FormLabel><FormControl><Input placeholder="e.g. Friend, Cousin" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={referralForm.control} name="contactNumber" render={({ field }) => (
                <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="09XX XXX XXXX" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={referralForm.control} name="referralCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Code (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="TRX-XXXXXX" className="pl-9" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>Link this referral to an existing student</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={referralForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional information..." className="resize-none" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4"><Button type="submit" className="w-full" disabled={createReferralMutation.isPending}>Submit Referral</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "approve" ? "Confirm Approval" : confirmAction?.type === "reject" ? "Confirm Rejection" : "Confirm Deletion"}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {confirmAction?.type === "approve" ? "Are you sure you want to approve this referral?" : 
               confirmAction?.type === "reject" ? "Are you sure you want to reject this referral?" : 
               "This will permanently delete the referral. Continue?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant={confirmAction?.type === "delete" ? "destructive" : "default"} onClick={executeReferralAction}>
              {confirmAction?.type === "approve" ? "Approve" : confirmAction?.type === "reject" ? "Reject" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SchoolFormDialog open={dialogOpen} onOpenChange={setDialogOpen} initialData={editingSchool} defaultCoordinates={selectedCoords} />
    </div>
  );
}
