import { useState, useEffect } from "react";
import { useSchools, useDeleteSchool } from "@/hooks/use-schools";
import { useReferrals, useCreateReferral, useUpdateReferral, useDeleteReferral } from "@/hooks/use-referrals";
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
  ArrowUpDown
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReferralSchema, type School, type ReferralInput, type Referral } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { data: schools, isLoading: schoolsLoading } = useSchools();
  const { data: referrals, isLoading: referralsLoading } = useReferrals();
  const deleteMutation = useDeleteSchool();
  const createReferralMutation = useCreateReferral();
  const updateReferralMutation = useUpdateReferral();
  const deleteReferralMutation = useDeleteReferral();
  
  const [search, setSearch] = useState("");
  const [referralSearch, setReferralSearch] = useState("");
  const [referralSort, setReferralSort] = useState<"name" | "status" | "date">("date");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);

  const filteredSchools = schools?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const sortedReferrals = [...(referrals || [])]
    .filter(r => r.referredName.toLowerCase().includes(referralSearch.toLowerCase()))
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

  const handleReferralAction = (id: number, status: string) => {
    updateReferralMutation.mutate({ id, updates: { status } });
  };

  const handleReferralDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this referral?")) {
      deleteReferralMutation.mutate(id);
    }
  };

  const referralForm = useForm<ReferralInput>({
    resolver: zodResolver(insertReferralSchema),
    defaultValues: {
      referrerId: undefined,
      referredName: "",
      relationship: "",
      contactNumber: "",
      status: "pending"
    }
  });

  const onReferralSubmit = (data: ReferralInput) => {
    createReferralMutation.mutate(data, {
      onSuccess: () => referralForm.reset()
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
              {/* Sidebar - Data List */}
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
                      <Input 
                        placeholder="Search schools..." 
                        className="pl-9 bg-secondary/50 border-transparent focus-visible:border-primary focus-visible:ring-1 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <Button size="icon" onClick={handleAddClick} className="hover-elevate active-elevate-2 shadow-md">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {schoolsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                      ))
                    ) : filteredSchools.map((school) => (
                      <div 
                        key={school.id} 
                        className="group flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-secondary/30 transition-all hover-elevate cursor-pointer"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0 pr-2" onClick={() => handleEdit(school)}>
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20 shrink-0">
                            {school.studentCount}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {school.name}
                            </h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              Laguna
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
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
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Main Map Area */}
              <div className="flex-1 relative z-10 h-full w-full bg-background overflow-hidden flex flex-col m-0 p-0 border-0">
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-6 left-6 z-[1100] shadow-xl hover-elevate border border-border/50 bg-background/80 backdrop-blur-md"
                  onClick={() => setIsPresenting(!isPresenting)}
                >
                  {isPresenting ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </Button>
                
                <div className="flex-1 w-full h-full relative overflow-hidden m-0 p-0 border-0">
                  <MapWrapper onAddSchool={handleMapClick} onEditSchool={handleEdit} />
                  <MapLegend />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="flex-1 h-full w-full m-0 p-6 overflow-hidden flex flex-col gap-6 data-[state=inactive]:hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
              <Card className="hover-elevate transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Mapped Schools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{schools?.length || 0}</div>
                </CardContent>
              </Card>
              <Card className="hover-elevate transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Enrollees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{schools?.reduce((sum, s) => sum + s.studentCount, 0).toLocaleString() || 0}</div>
                </CardContent>
              </Card>
              <Card className="hover-elevate transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Top Feeder</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold truncate">{[...(schools || [])].sort((a,b) => b.studentCount - a.studentCount)[0]?.name || "None"}</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-hidden">
              <Card className="flex flex-col min-h-0 hover-elevate transition-all overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart2 className="w-5 h-5 text-primary" /> Enrollment Distribution</CardTitle>
                  <CardDescription>Top 10 Schools by Student Volume</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-0 pb-6 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...(schools || [])].sort((a,b) => b.studentCount - a.studentCount).slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" hide />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                      />
                      <Bar dataKey="studentCount" radius={[4, 4, 0, 0]}>
                        {(schools || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.6)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="flex flex-col min-h-0 hover-elevate transition-all overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><TableIcon className="w-5 h-5 text-primary" /> Origin Schools List</CardTitle>
                    <CardDescription>Detailed breakdown of enrollment numbers</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>School Name</TableHead>
                          <TableHead className="text-right">Enrollees</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...(schools || [])].sort((a,b) => b.studentCount - a.studentCount).map((school) => (
                          <TableRow key={school.id} className="hover:bg-secondary/30 transition-colors">
                            <TableCell className="font-medium">{school.name}</TableCell>
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

          <TabsContent value="referral" className="flex-1 h-full w-full m-0 p-6 overflow-hidden flex flex-col gap-6 data-[state=inactive]:hidden">
            <div className="flex items-center justify-between gap-4 shrink-0">
              <div className="flex-1 max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search referrals..." 
                  className="pl-9"
                  value={referralSearch}
                  onChange={(e) => setReferralSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setReferralSort("name")} className={cn(referralSort === "name" && "bg-primary/10")}>
                  <ArrowUpDown className="w-4 h-4 mr-2" /> Name
                </Button>
                <Button variant="outline" size="sm" onClick={() => setReferralSort("status")} className={cn(referralSort === "status" && "bg-primary/10")}>
                  <ArrowUpDown className="w-4 h-4 mr-2" /> Status
                </Button>
                <Button variant="outline" size="sm" onClick={() => setReferralSort("date")} className={cn(referralSort === "date" && "bg-primary/10")}>
                  <ArrowUpDown className="w-4 h-4 mr-2" /> Date
                </Button>
              </div>
            </div>

            <Card className="flex-1 flex flex-col min-h-0 hover-elevate transition-all overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl"><UserPlus className="w-6 h-6 text-primary" /> Referral Management</CardTitle>
                  <CardDescription>Approve or manage student referrals</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full px-6">
                  {referralsLoading ? (
                    <div className="space-y-4 py-4">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Relationship</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedReferrals.map((ref) => (
                          <TableRow key={ref.id} className="hover:bg-secondary/30 transition-colors">
                            <TableCell className="font-bold">{ref.referredName}</TableCell>
                            <TableCell>{ref.relationship}</TableCell>
                            <TableCell>{ref.contactNumber}</TableCell>
                            <TableCell>
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                ref.status === 'enrolled' ? "bg-primary/20 text-primary" : 
                                ref.status === 'rejected' ? "bg-destructive/20 text-destructive" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {ref.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {ref.status === 'pending' && (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleReferralAction(ref.id, 'enrolled')}>
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleReferralAction(ref.id, 'rejected')}>
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleReferralDelete(ref.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* School Form Dialog */}
      <SchoolFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        initialData={editingSchool}
        defaultCoordinates={selectedCoords}
      />
    </div>
  );
}
