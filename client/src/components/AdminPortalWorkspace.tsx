import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CloudOff,
  Database,
  Download,
  Edit,
  Eye,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  Settings2,
  ShieldCheck,
  Trash2,
  UserCircle2,
  Users,
} from "lucide-react";
import type { Import, School, StudentProcessed } from "@shared/schema";
import { hasCoordinates } from "@shared/schoolRegistry";
import { ALL_PROGRAM_FILTER, PROGRAM_CATALOG, normalizeStudentProgramValue, recognizeProgram } from "@shared/programIntelligence";
import { formatAdmissionLabel, parseStudentNumberTag } from "@/lib/adminPortalUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { cn } from "@/lib/utils";

export type AdminPortalSection = "overview" | "students" | "feed" | "queue" | "registry" | "import-logs" | "settings";

export interface AdminPortalWorkspaceProps {
  section: AdminPortalSection;
  onSectionChange: (section: AdminPortalSection) => void;
  schools: School[];
  processedStudents: StudentProcessed[];
  gisOverview?: {
    totalStudentsSynced: number;
    freshmenCount: number;
    transfereeCount: number;
    verifiedSchools: number;
    unmappedSchools: number;
  } | null;
  importLogs: Import[];
  schoolsLoading: boolean;
  schoolsUpdatedAt: number;
  duplicateIds: Set<number>;
  renderIntegrationControls: () => ReactNode;
  renderGisWorkspaceSettings: () => ReactNode;
  renderSchoolRegistry: () => ReactNode;
  onAddSchool: () => void;
  onEditSchool: (school: School) => void;
  onGeolocateSchool: (school: School) => void;
  onDeleteSchool: (school: School) => void;
  onRemoveDuplicate: (school: School) => void;
}

type StudentEditDraft = {
  studentNumber: string;
  fullName: string;
  course: string;
  lastSchoolName: string;
  lastSchoolType: string;
  municipality: string;
  province: string;
  yearLevel: string;
  enrollmentStatus: string;
  enrollmentDate: string;
};

function sectionTabs(queueCount: number): { value: AdminPortalSection; label: string; short: string; icon: ReactNode }[] {
  const queueLabel = queueCount > 0 ? `Mapping Queue (${queueCount})` : "Mapping Queue";
  const queueShort = queueCount > 0 ? `Queue (${queueCount})` : "Queue";
  return [
    { value: "overview", label: "Overview", short: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { value: "students", label: "Students", short: "Students", icon: <Users className="h-4 w-4" /> },
    { value: "feed", label: "Live Student Feed", short: "Feed", icon: <Activity className="h-4 w-4" /> },
    { value: "queue", label: queueLabel, short: queueShort, icon: <ListChecks className="h-4 w-4" /> },
    { value: "registry", label: "School Registry", short: "Registry", icon: <Database className="h-4 w-4" /> },
    { value: "import-logs", label: "Import Logs", short: "Logs", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "settings", label: "Settings", short: "Settings", icon: <Settings2 className="h-4 w-4" /> },
  ];
}

function formatSyncTime(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function AdminPortalWorkspace({
  section,
  onSectionChange,
  schools,
  processedStudents,
  gisOverview,
  importLogs,
  schoolsLoading,
  schoolsUpdatedAt,
  duplicateIds,
  renderIntegrationControls,
  renderGisWorkspaceSettings,
  renderSchoolRegistry,
  onAddSchool,
  onEditSchool,
  onGeolocateSchool,
  onDeleteSchool,
  onRemoveDuplicate,
}: AdminPortalWorkspaceProps) {
  const [settingsPanel, setSettingsPanel] = useState<"integrations" | "map">("integrations");
  const { toast } = useToast();

  const [feedSearch, setFeedSearch] = useState("");
  const [feedSelected, setFeedSelected] = useState<Set<number>>(new Set());
  const [isDeletingFeed, setIsDeletingFeed] = useState(false);

  const [studentSearch, setStudentSearch] = useState("");
  const [studentSelected, setStudentSelected] = useState<Set<number>>(new Set());
  const [studentCollegeFilter, setStudentCollegeFilter] = useState(ALL_PROGRAM_FILTER);
  const [studentProgramFilter, setStudentProgramFilter] = useState(ALL_PROGRAM_FILTER);
  const [studentTrackFilter, setStudentTrackFilter] = useState(ALL_PROGRAM_FILTER);
  const [studentYearFilter, setStudentYearFilter] = useState(ALL_PROGRAM_FILTER);
  const [studentMunicipalityFilter, setStudentMunicipalityFilter] = useState(ALL_PROGRAM_FILTER);
  const [studentStatusFilter, setStudentStatusFilter] = useState(ALL_PROGRAM_FILTER);
  const [studentSort, setStudentSort] = useState("Newest");
  const [studentPage, setStudentPage] = useState(1);
  const [isStudentBulkAction, setIsStudentBulkAction] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<StudentProcessed | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentProcessed | null>(null);
  const [studentEditDraft, setStudentEditDraft] = useState<StudentEditDraft | null>(null);

  const [queueSearch, setQueueSearch] = useState("");
  const [queueSelected, setQueueSelected] = useState<Set<number>>(new Set());
  const [isDeletingQueue, setIsDeletingQueue] = useState(false);

  const [logsSearch, setLogsSearch] = useState("");
  const [logsSelected, setLogsSelected] = useState<Set<number>>(new Set());
  const [isDeletingLogs, setIsDeletingLogs] = useState(false);

  const deleteFeed = async () => {
    try {
      setIsDeletingFeed(true);
      const res = await apiRequest("POST", "/api/students/processed/batch-delete", { ids: Array.from(feedSelected) });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: data.message });
        setFeedSelected(new Set());
        void queryClient.invalidateQueries({ queryKey: ["/api/gis/overview"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/students/processed"] });
      } else {
        toast({ title: "Delete Error", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Delete Failed", description: String(e), variant: "destructive" });
    } finally {
      setIsDeletingFeed(false);
    }
  };

  const refreshStudentManagement = () => {
    void queryClient.invalidateQueries({ queryKey: ["/api/gis/overview"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/students/processed"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
  };

  const updateSelectedStudentStatus = async (status: string) => {
    try {
      setIsStudentBulkAction(true);
      const res = await apiRequest("POST", "/api/students/processed/batch-status", {
        ids: Array.from(studentSelected),
        enrollmentStatus: status,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Students updated", description: data.message });
        setStudentSelected(new Set());
        refreshStudentManagement();
      } else {
        toast({ title: "Update failed", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" });
    } finally {
      setIsStudentBulkAction(false);
    }
  };

  const updateStudentStatusByIds = async (ids: number[], status: string) => {
    try {
      setIsStudentBulkAction(true);
      const res = await apiRequest("POST", "/api/students/processed/batch-status", {
        ids,
        enrollmentStatus: status,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Student updated", description: data.message });
        refreshStudentManagement();
      } else {
        toast({ title: "Update failed", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" });
    } finally {
      setIsStudentBulkAction(false);
    }
  };

  const deleteSelectedStudents = async () => {
    try {
      setIsStudentBulkAction(true);
      const res = await apiRequest("POST", "/api/students/processed/batch-delete", { ids: Array.from(studentSelected) });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Students deleted", description: data.message });
        setStudentSelected(new Set());
        refreshStudentManagement();
      } else {
        toast({ title: "Delete failed", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Delete failed", description: String(e), variant: "destructive" });
    } finally {
      setIsStudentBulkAction(false);
    }
  };

  const deleteStudentsByIds = async (ids: number[]) => {
    try {
      setIsStudentBulkAction(true);
      const res = await apiRequest("POST", "/api/students/processed/batch-delete", { ids });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Student deleted", description: data.message });
        refreshStudentManagement();
      } else {
        toast({ title: "Delete failed", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Delete failed", description: String(e), variant: "destructive" });
    } finally {
      setIsStudentBulkAction(false);
    }
  };

  const startEditStudent = (student: StudentProcessed) => {
    setEditingStudent(student);
    setStudentEditDraft({
      studentNumber: student.studentNumber || "",
      fullName: student.fullName || "",
      course: student.course || "",
      lastSchoolName: student.lastSchoolName || "",
      lastSchoolType: student.lastSchoolType || "",
      municipality: student.municipality || "Laguna",
      province: student.province || "Laguna",
      yearLevel: student.yearLevel || "",
      enrollmentStatus: student.enrollmentStatus || "Active",
      enrollmentDate: toInputDate(student.enrollmentDate),
    });
  };

  const saveStudentEdit = async () => {
    if (!editingStudent || !studentEditDraft) return;
    try {
      const res = await apiRequest("PATCH", `/api/students/processed/${editingStudent.id}`, {
        ...studentEditDraft,
        course: normalizeStudentProgramValue(studentEditDraft.course),
        lastSchoolType: studentEditDraft.lastSchoolType || null,
        yearLevel: studentEditDraft.yearLevel || null,
        enrollmentDate: studentEditDraft.enrollmentDate || null,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Unable to update student." }));
        throw new Error(data.message || "Unable to update student.");
      }
      toast({ title: "Student updated", description: "Student Management and GIS counts were refreshed." });
      setEditingStudent(null);
      setStudentEditDraft(null);
      refreshStudentManagement();
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" });
    }
  };

  const exportStudents = (rows: ManagedStudent[]) => {
    const csv = toStudentCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `student-management-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const deleteQueue = async () => {
    try {
      setIsDeletingQueue(true);
      const res = await apiRequest("POST", "/api/schools/batch-delete", { ids: Array.from(queueSelected) });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: data.message });
        setQueueSelected(new Set());
        void queryClient.invalidateQueries({ queryKey: ["/api/gis/overview"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/mapping/queue"] });
      } else {
        toast({ title: "Delete Error", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Delete Failed", description: String(e), variant: "destructive" });
    } finally {
      setIsDeletingQueue(false);
    }
  };

  const deleteLogs = async () => {
    try {
      setIsDeletingLogs(true);
      const res = await apiRequest("POST", "/api/imports/batch-delete", { ids: Array.from(logsSelected) });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: data.message });
        setLogsSelected(new Set());
        void queryClient.invalidateQueries({ queryKey: ["/api/imports/logs"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/students/processed"] });
      } else {
        toast({ title: "Delete Error", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Delete Failed", description: String(e), variant: "destructive" });
    } finally {
      setIsDeletingLogs(false);
    }
  };

  const overview = useMemo(() => {
    const verifiedSchools = gisOverview?.verifiedSchools ?? schools.filter((s) => s.verified && hasCoordinates(s)).length;
    const unmappedSchools = gisOverview?.unmappedSchools ?? schools.filter((s) => !hasCoordinates(s)).length;
    const totalStudentsSynced = gisOverview?.totalStudentsSynced ?? processedStudents.length;
    const freshmenCount = gisOverview?.freshmenCount ?? processedStudents.filter((s) => s.admissionType === "Freshman").length;
    const transfereeCount = gisOverview?.transfereeCount ?? processedStudents.filter((s) => s.admissionType === "Transferee").length;

    return {
      totalStudentsSynced,
      freshmenCount: freshmenCount > 0 ? String(freshmenCount) : processedStudents.length === 0 ? "—" : String(freshmenCount),
      transfereeCount: transfereeCount > 0 ? String(transfereeCount) : processedStudents.length === 0 ? "—" : String(transfereeCount),
      verifiedSchools,
      unmappedSchools,
      apiSyncStatus: schoolsLoading ? "Loading registry…" : processedStudents.length > 0 ? "Synced · GIS pipeline" : "Idle · connect API in Settings",
    };
  }, [schools, schoolsLoading, gisOverview, processedStudents]);

  const studentRows = useMemo(() => processedStudents.map((student) => enrichStudentRow(student, schools)), [processedStudents, schools]);
  const studentOptions = useMemo(() => ({
    colleges: uniqueSorted([...PROGRAM_CATALOG.map((program) => program.college), ...studentRows.map((row) => row.college)].filter(Boolean)),
    programs: uniqueSorted([...PROGRAM_CATALOG.map((program) => program.program), ...studentRows.map((row) => row.program)].filter(Boolean)),
    tracks: uniqueSorted([...PROGRAM_CATALOG.map((program) => program.track || "General"), ...studentRows.map((row) => row.track || "General")]),
    years: uniqueSorted(studentRows.map((row) => row.yearLevel || "Unspecified")),
    municipalities: uniqueSorted(studentRows.map((row) => row.municipality || "Laguna")),
    statuses: STUDENT_STATUSES,
  }), [studentRows]);

  const studentStats = useMemo(() => {
    const active = studentRows.filter((row) => isMapActiveStatus(row.enrollmentStatus)).length;
    const archived = studentRows.filter((row) => row.enrollmentStatus === "Archived").length;
    const mapped = studentRows.filter((row) => row.schoolId && row.mappingStatus !== "needs_review" && row.mappingStatus !== "pending").length;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: studentRows.length,
      active,
      mapped,
      unmapped: studentRows.length - mapped,
      newStudents: studentRows.filter((row) => new Date(row.syncedAt).getTime() >= weekAgo).length,
      archived,
    };
  }, [studentRows]);

  const studentsManaged = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return studentRows
      .filter((row) => !query || [
        row.studentNumber,
        row.fullName,
        row.course || "",
        row.lastSchoolName,
        row.municipality,
        row.enrollmentStatus,
      ].some((value) => value.toLowerCase().includes(query)))
      .filter((row) => studentCollegeFilter === ALL_PROGRAM_FILTER || row.college === studentCollegeFilter)
      .filter((row) => studentProgramFilter === ALL_PROGRAM_FILTER || row.program === studentProgramFilter)
      .filter((row) => studentTrackFilter === ALL_PROGRAM_FILTER || (row.track || "General") === studentTrackFilter)
      .filter((row) => studentYearFilter === ALL_PROGRAM_FILTER || (row.yearLevel || "Unspecified") === studentYearFilter)
      .filter((row) => studentMunicipalityFilter === ALL_PROGRAM_FILTER || (row.municipality || "Laguna") === studentMunicipalityFilter)
      .filter((row) => studentStatusFilter === ALL_PROGRAM_FILTER || row.enrollmentStatus === studentStatusFilter)
      .sort((a, b) => sortStudents(a, b, studentSort));
  }, [
    studentRows,
    studentSearch,
    studentCollegeFilter,
    studentProgramFilter,
    studentTrackFilter,
    studentYearFilter,
    studentMunicipalityFilter,
    studentStatusFilter,
    studentSort,
  ]);

  const studentPageSize = 25;
  const studentTotalPages = Math.max(1, Math.ceil(studentsManaged.length / studentPageSize));
  const studentCurrentPage = Math.min(studentPage, studentTotalPages);
  const studentPageRows = studentsManaged.slice((studentCurrentPage - 1) * studentPageSize, studentCurrentPage * studentPageSize);
  const selectedManagedRows = studentsManaged.filter((row) => studentSelected.has(row.id));

  const queueSchools = useMemo(
    () =>
      [...schools]
        .filter(
          (s) =>
            !hasCoordinates(s) ||
            duplicateIds.has(s.id) ||
            s.status === "Needs Review" ||
            s.status === "Missing Coordinates",
        ),
    [schools, duplicateIds],
  );

  const queueSchoolsFiltered = useMemo(() => {
    let list = [...queueSchools];
    if (queueSearch) {
      const q = queueSearch.toLowerCase();
      list = list.filter((s) => 
        s.name.toLowerCase().includes(q) ||
        (s.municipality && s.municipality.toLowerCase().includes(q)) ||
        (s.province && s.province.toLowerCase().includes(q)) ||
        (s.status && s.status.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [queueSchools, queueSearch]);

  const studentsFiltered = useMemo(() => {
    let list = [...processedStudents];
    if (feedSearch) {
      const q = feedSearch.toLowerCase();
      list = list.filter(s => 
        (s.studentNumber && s.studentNumber.toLowerCase().includes(q)) ||
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.course && s.course.toLowerCase().includes(q)) ||
        (s.lastSchoolName && s.lastSchoolName.toLowerCase().includes(q)) ||
        (s.admissionType && s.admissionType.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime());
  }, [processedStudents, feedSearch]);

  const importLogsFiltered = useMemo(() => {
    let list = [...importLogs];
    if (logsSearch) {
      const q = logsSearch.toLowerCase();
      list = list.filter(log => 
        (log.source && log.source.toLowerCase().includes(q)) ||
        (log.status && log.status.toLowerCase().includes(q)) ||
        (log.notes && log.notes.toLowerCase().includes(q))
      );
    }
    return list;
  }, [importLogs, logsSearch]);

  function mappingStatusLabel(status: string) {
    if (status === "verified") return "Verified";
    if (status === "mapped") return "Mapped";
    if (status === "needs_review") return "Needs review";
    return "Pending";
  }

  const navItems = sectionTabs(queueSchools.length);

  return (
    <div className="admin-portal-shell flex h-full min-h-0 flex-col overflow-hidden">
      <Tabs
        value={section}
        onValueChange={(v) => onSectionChange(v as AdminPortalSection)}
        className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:flex-row md:gap-4 md:p-4"
      >
        <aside className="shrink-0 rounded-2xl border border-border/80 bg-surface/80 p-1.5 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.55)] backdrop-blur-md md:w-60 md:p-2">
          <TabsList
            aria-label="Admin sections"
            className={cn(
              "flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border/70 bg-surface-soft/70 p-1 text-muted-foreground shadow-inner shadow-white/30 backdrop-blur-md",
              "md:flex-col md:overflow-visible md:bg-transparent md:p-0 md:shadow-none",
            )}
          >
            {navItems.map(({ value, label, short, icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  "group relative min-w-max shrink-0 justify-start gap-2 rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-muted-foreground shadow-none transition-all",
                  "hover:bg-surface hover:text-foreground",
                  "data-[state=active]:border-primary/25 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_14px_34px_-24px_rgba(123,17,19,0.9)]",
                  "md:w-full md:min-w-0 md:px-3.5 md:py-2.5",
                )}
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface/80 text-muted-foreground transition-colors group-data-[state=active]:bg-primary-hover group-data-[state=active]:text-white">
                  {icon}
                </span>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </aside>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface/85 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.55)] backdrop-blur-md">

        <TabsContent value="overview" className="m-0 mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatMini
                  title="Total students synced"
                  value={overview.totalStudentsSynced.toLocaleString()}
                  icon={<GraduationCap className="h-3.5 w-3.5" />}
                />
                <StatMini title="Freshmen" value={overview.freshmenCount} sub="SHS → Frosh when API connected" icon={<UserCircle2 className="h-3.5 w-3.5" />} />
                <StatMini title="Transferees" value={overview.transfereeCount} sub="College → xfer when API connected" icon={<ArrowRightLeft className="h-3.5 w-3.5" />} />
                <StatMini title="Verified schools" value={String(overview.verifiedSchools)} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
                <StatMini title="Unmapped schools" value={String(overview.unmappedSchools)} warn={overview.unmappedSchools > 0} icon={<MapPinned className="h-3.5 w-3.5" />} />
                <StatMini title="API sync status" value={overview.apiSyncStatus} icon={<CloudOff className="h-3.5 w-3.5" />} />
                <StatMini title="Last sync" value={formatSyncTime(schoolsUpdatedAt)} sub="Registry data refresh" icon={<Clock3 className="h-3.5 w-3.5" />} />
              </div>
              <Card className="border-white/70 bg-white/70 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                <CardHeader className="space-y-1 pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <GitBranch className="h-4 w-4 text-slate-600" />
                    School matching pipeline
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    API / Excel / Sheets → students_raw → students_processed → school_aliases → schools registry → GIS
                    aggregation → map. Names normalize; aliases dedupe; verified coordinates reuse.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="students" className="m-0 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
              <StudentStat title="Total Students" value={studentStats.total} />
              <StudentStat title="Active Students" value={studentStats.active} tone="emerald" />
              <StudentStat title="Mapped Students" value={studentStats.mapped} tone="sky" />
              <StudentStat title="Unmapped Students" value={studentStats.unmapped} tone="amber" />
              <StudentStat title="New Students" value={studentStats.newStudents} tone="violet" />
              <StudentStat title="Archived Students" value={studentStats.archived} tone="slate" />
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative min-w-0 flex-1">
                  <Input
                    className="h-9 bg-slate-50 text-sm"
                    placeholder="Search student number, name, program, school..."
                    value={studentSearch}
                    onChange={(event) => {
                      setStudentSearch(event.target.value);
                      setStudentPage(1);
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="h-9 gap-2 text-xs"
                    disabled={selectedManagedRows.length === 0}
                    onClick={() => exportStudents(selectedManagedRows.length ? selectedManagedRows : studentsManaged)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Selected
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 gap-2 text-xs"
                    disabled={studentSelected.size === 0 || isStudentBulkAction}
                    onClick={() => updateSelectedStudentStatus("Archived")}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive Selected
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 gap-2 text-xs text-rose-700"
                    disabled={studentSelected.size === 0 || isStudentBulkAction}
                    onClick={deleteSelectedStudents}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Selected
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                <StudentFilterSelect label="College" value={studentCollegeFilter} values={studentOptions.colleges} allLabel="All Colleges" onChange={(value) => { setStudentCollegeFilter(value); setStudentPage(1); }} />
                <StudentFilterSelect label="Program" value={studentProgramFilter} values={studentOptions.programs} allLabel="All Programs" onChange={(value) => { setStudentProgramFilter(value); setStudentPage(1); }} />
                <StudentFilterSelect label="Track" value={studentTrackFilter} values={studentOptions.tracks} allLabel="All Tracks" onChange={(value) => { setStudentTrackFilter(value); setStudentPage(1); }} />
                <StudentFilterSelect label="Year" value={studentYearFilter} values={studentOptions.years} allLabel="All Years" onChange={(value) => { setStudentYearFilter(value); setStudentPage(1); }} />
                <StudentFilterSelect label="Municipality" value={studentMunicipalityFilter} values={studentOptions.municipalities} allLabel="All Municipalities" onChange={(value) => { setStudentMunicipalityFilter(value); setStudentPage(1); }} />
                <StudentFilterSelect label="Status" value={studentStatusFilter} values={studentOptions.statuses} allLabel="All Statuses" onChange={(value) => { setStudentStatusFilter(value); setStudentPage(1); }} />
                <StudentFilterSelect label="Sort" value={studentSort} values={STUDENT_SORTS} onChange={(value) => { setStudentSort(value); setStudentPage(1); }} />
              </div>
            </div>

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-slate-200 shadow-sm">
              <div className="min-h-0 flex-1 overflow-auto">
                <Table className="min-w-[1320px] text-xs">
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(226_232_240)]">
                    <TableRow>
                      <TableHead className="w-10 px-4">
                        <Checkbox
                          checked={studentPageRows.length > 0 && studentPageRows.every((row) => studentSelected.has(row.id))}
                          onCheckedChange={(checked) => {
                            const next = new Set(studentSelected);
                            studentPageRows.forEach((row) => checked ? next.add(row.id) : next.delete(row.id));
                            setStudentSelected(next);
                          }}
                          aria-label="Select page students"
                        />
                      </TableHead>
                      <TableHead>Student Number</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>College / Department</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Year Level</TableHead>
                      <TableHead>Last School Attended</TableHead>
                      <TableHead>Municipality</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrollment Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentPageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center text-slate-500">No students match the current filters.</TableCell>
                      </TableRow>
                    ) : studentPageRows.map((student) => (
                      <TableRow key={student.id} data-state={studentSelected.has(student.id) ? "selected" : undefined}>
                        <TableCell className="px-4">
                          <Checkbox
                            checked={studentSelected.has(student.id)}
                            onCheckedChange={(checked) => {
                              const next = new Set(studentSelected);
                              if (checked) next.add(student.id);
                              else next.delete(student.id);
                              setStudentSelected(next);
                            }}
                            aria-label={`Select student ${student.studentNumber}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-[11px]">{student.studentNumber}</TableCell>
                        <TableCell className="font-semibold text-slate-900">{student.fullName}</TableCell>
                        <TableCell>{student.collegeName}</TableCell>
                        <TableCell>{student.program}</TableCell>
                        <TableCell>{student.track || "General"}</TableCell>
                        <TableCell>{student.yearLevel || "Unspecified"}</TableCell>
                        <TableCell className="max-w-[210px] truncate" title={student.lastSchoolName}>{student.lastSchoolName}</TableCell>
                        <TableCell>{student.municipality || "Laguna"}</TableCell>
                        <TableCell><StudentStatusBadge status={student.enrollmentStatus} /></TableCell>
                        <TableCell>{formatSyncTime(new Date(student.enrollmentDate || student.syncedAt).getTime())}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingStudent(student)} title="View student">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditStudent(student)} title="Edit student">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-700" onClick={() => updateStudentStatusByIds([student.id], "Archived")} title="Archive student">
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-700" onClick={() => deleteStudentsByIds([student.id])} title="Delete student">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>{studentsManaged.length.toLocaleString()} students · {studentSelected.size.toLocaleString()} selected</span>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" disabled={studentCurrentPage <= 1} onClick={() => setStudentPage((page) => Math.max(1, page - 1))}>Previous</Button>
                  <span className="min-w-[92px] text-center">Page {studentCurrentPage} of {studentTotalPages}</span>
                  <Button variant="outline" size="sm" className="h-8 text-xs" disabled={studentCurrentPage >= studentTotalPages} onClick={() => setStudentPage((page) => Math.min(studentTotalPages, page + 1))}>Next</Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="feed" className="m-0 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4">
            <TableToolbar
              searchQuery={feedSearch}
              onSearchChange={setFeedSearch}
              searchPlaceholder="Search student number, name, course..."
              selectedCount={feedSelected.size}
              onClearSelection={() => setFeedSelected(new Set())}
              onDelete={deleteFeed}
              isDeleting={isDeletingFeed}
              deleteItemName="students"
            />
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-white/70 bg-white/70 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur-xl">
              <CardHeader className="shrink-0 border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-semibold">Live student feed</CardTitle>
              </CardHeader>
              <div className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white/90 shadow-[0_1px_0_0_rgb(241_245_249)] backdrop-blur-xl">
                    <TableRow>
                      <TableHead className="w-10 px-4">
                        <Checkbox 
                          checked={studentsFiltered.length > 0 && feedSelected.size === studentsFiltered.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFeedSelected(new Set(studentsFiltered.map(s => s.id)));
                            } else {
                              setFeedSelected(new Set());
                            }
                          }}
                          aria-label="Select all students"
                        />
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase">Student</TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase sm:table-cell">Course</TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase md:table-cell">Raw School</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase">Matched To</TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase lg:table-cell">Type</TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase lg:table-cell">Status</TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase lg:table-cell">Synced</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center">
                          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-900">No students found</p>
                          <p className="text-xs text-slate-500">Wait for next API sync or import from CSV.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentsFiltered.map((st) => {
                        const matchedSchool = st.schoolId ? schools.find(s => s.id === st.schoolId) : null;
                        const matchedSchoolName = matchedSchool?.name || null;

                        return (
                        <TableRow key={st.id} className="text-xs hover:bg-slate-50/50" data-state={feedSelected.has(st.id) ? "selected" : undefined}>
                          <TableCell className="px-4">
                            <Checkbox 
                              checked={feedSelected.has(st.id)}
                              onCheckedChange={(checked) => {
                                const next = new Set(feedSelected);
                                if (checked) next.add(st.id);
                                else next.delete(st.id);
                                setFeedSelected(next);
                              }}
                              aria-label={`Select student ${st.studentNumber}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900">{st.studentNumber}</div>
                            <div className="text-[10px] text-slate-500">{st.fullName || "—"}</div>
                          </TableCell>
                          <TableCell className="hidden text-slate-600 sm:table-cell">{st.course || "—"}</TableCell>
                          <TableCell className="hidden max-w-[150px] truncate md:table-cell" title={st.lastSchoolName || undefined}>
                            {st.lastSchoolName || "—"}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={matchedSchoolName || undefined}>
                            {matchedSchoolName ? (
                              <span className="font-medium text-slate-900">{matchedSchoolName}</span>
                            ) : (
                              <span className="text-slate-400">Unmapped</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden align-top lg:table-cell">{st.lastSchoolType || "—"}</TableCell>
                          <TableCell className="hidden align-top lg:table-cell">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {mappingStatusLabel(st.mappingStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap align-top text-slate-500 lg:table-cell">
                            {formatSyncTime(new Date(st.syncedAt).getTime())}
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queue" className="m-0 mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-4xl space-y-3 p-3 sm:p-4">
              <TableToolbar
                searchQuery={queueSearch}
                onSearchChange={setQueueSearch}
                searchPlaceholder="Search queue..."
                selectedCount={queueSelected.size}
                onClearSelection={() => setQueueSelected(new Set())}
                onDelete={deleteQueue}
                isDeleting={isDeletingQueue}
                deleteItemName="schools"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">
                  Unknown schools, low-confidence matches, and missing coordinates. Verify, pin, approve, or merge.
                </p>
                <Button size="sm" className="h-8 text-xs" onClick={onAddSchool}>
                  Add school
                </Button>
              </div>
              {queueSchoolsFiltered.length === 0 ? (
                <Card className="border-white/70 bg-white/70 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                  <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
                    <p className="text-sm font-medium text-slate-700">Queue is clear</p>
                    <p className="text-xs text-slate-500">No schools need review or coordinates.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden border-white/70 bg-white/70 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur-xl">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 px-4">
                          <Checkbox 
                            checked={queueSchoolsFiltered.length > 0 && queueSelected.size === queueSchoolsFiltered.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setQueueSelected(new Set(queueSchoolsFiltered.map(s => s.id)));
                              } else {
                                setQueueSelected(new Set());
                              }
                            }}
                            aria-label="Select all schools"
                          />
                        </TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase">School</TableHead>
                        <TableHead className="hidden text-[10px] font-semibold uppercase sm:table-cell">Issue</TableHead>
                        <TableHead className="text-right text-[10px] font-semibold uppercase">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueSchoolsFiltered.map((s) => (
                        <TableRow key={s.id} className="text-xs" data-state={queueSelected.has(s.id) ? "selected" : undefined}>
                          <TableCell className="px-4">
                            <Checkbox 
                              checked={queueSelected.has(s.id)}
                              onCheckedChange={(checked) => {
                                const next = new Set(queueSelected);
                                if (checked) next.add(s.id);
                                else next.delete(s.id);
                                setQueueSelected(next);
                              }}
                              aria-label={`Select school ${s.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {s.municipality} · {s.institutionType}
                            </p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {!hasCoordinates(s) ? (
                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-900">
                                  No coordinates
                                </Badge>
                              ) : null}
                              {duplicateIds.has(s.id) ? (
                                <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[10px] text-rose-800">
                                  Duplicate
                                </Badge>
                              ) : null}
                              {s.status === "Needs Review" ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Needs review
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button variant="secondary" size="sm" className="h-7 px-2 text-[11px]" onClick={() => onEditSchool(s)}>
                                Verify
                              </Button>
                              {!hasCoordinates(s) ? (
                                <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => onGeolocateSchool(s)}>
                                  Pin
                                </Button>
                              ) : null}
                              {duplicateIds.has(s.id) ? (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-amber-700" onClick={() => onRemoveDuplicate(s)}>
                                  Merge
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="registry" className="m-0 mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="p-3 sm:p-4">{renderSchoolRegistry()}</div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="import-logs" className="m-0 mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-4xl p-3 sm:p-4 space-y-4">
              <TableToolbar
                searchQuery={logsSearch}
                onSearchChange={setLogsSearch}
                searchPlaceholder="Search logs..."
                selectedCount={logsSelected.size}
                onClearSelection={() => setLogsSelected(new Set())}
                onDelete={deleteLogs}
                isDeleting={isDeletingLogs}
                deleteItemName="import logs"
              />
              <Card className="border-white/70 bg-white/70 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Import & sync history</CardTitle>
                  <CardDescription className="text-xs">API runs and GIS pipeline sync history.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 px-4">
                          <Checkbox 
                            checked={importLogsFiltered.length > 0 && logsSelected.size === importLogsFiltered.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setLogsSelected(new Set(importLogsFiltered.map(log => log.id)));
                              } else {
                                setLogsSelected(new Set());
                              }
                            }}
                            aria-label="Select all logs"
                          />
                        </TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase">Time</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase">Source</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase">Imported</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase">Failed</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importLogsFiltered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center">
                            <AlertCircle className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                            <p className="text-xs font-medium text-slate-700">No sync runs logged yet</p>
                            <p className="mt-1 text-[11px] text-slate-500">Run a sync from Settings to populate this table.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        importLogsFiltered.map((log) => (
                          <TableRow key={log.id} className="text-xs" data-state={logsSelected.has(log.id) ? "selected" : undefined}>
                            <TableCell className="px-4">
                              <Checkbox 
                                checked={logsSelected.has(log.id)}
                                onCheckedChange={(checked) => {
                                  const next = new Set(logsSelected);
                                  if (checked) next.add(log.id);
                                  else next.delete(log.id);
                                  setLogsSelected(next);
                                }}
                                aria-label={`Select log from ${log.source}`}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatSyncTime(new Date(log.startedAt).getTime())}
                            </TableCell>
                            <TableCell>{log.source}</TableCell>
                            <TableCell className="tabular-nums">{log.importedCount}</TableCell>
                            <TableCell className="tabular-nums">{log.failedCount}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {log.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="m-0 mt-0 min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-white/20 px-4 py-3 bg-white/20 backdrop-blur-md">
            <button
              onClick={() => setSettingsPanel("integrations")}
              className={cn("flex items-center gap-2 px-4 py-1.5 text-[13px] font-semibold rounded-full transition-all", settingsPanel === "integrations" ? "bg-teal-500 text-white shadow-sm" : "text-slate-600 hover:bg-white/50")}
            >
              <Database className="h-3.5 w-3.5" />
              API Data Settings
            </button>
            <button
              onClick={() => setSettingsPanel("map")}
              className={cn("flex items-center gap-2 px-4 py-1.5 text-[13px] font-semibold rounded-full transition-all", settingsPanel === "map" ? "bg-teal-500 text-white shadow-sm" : "text-slate-600 hover:bg-white/50")}
            >
              <MapPinned className="h-3.5 w-3.5" />
              Map Settings
            </button>
          </div>
          <ScrollArea className="flex-1 min-h-0 w-full h-full">
            <div className="flex h-full w-full flex-col p-0 m-0 min-h-0">
              <section className={cn("flex min-h-[600px] min-w-0 flex-col h-full w-full items-start", settingsPanel !== "integrations" && "hidden")}>
                {renderIntegrationControls()}
              </section>
              <section className={cn("min-w-0 p-4", settingsPanel !== "map" && "hidden")}>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Map Settings</h3>
                {renderGisWorkspaceSettings()}
              </section>
            </div>
          </ScrollArea>
        </TabsContent>

        <Dialog open={Boolean(viewingStudent)} onOpenChange={(open) => !open && setViewingStudent(null)}>
          <DialogContent className="max-w-2xl rounded-lg">
            <DialogHeader>
              <DialogTitle>Student Profile</DialogTitle>
              <DialogDescription>Complete student mapping record used by the GIS platform.</DialogDescription>
            </DialogHeader>
            {viewingStudent ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {studentProfileFields(viewingStudent).map((field) => (
                  <div key={field.label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{field.label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{field.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(editingStudent)} onOpenChange={(open) => {
          if (!open) {
            setEditingStudent(null);
            setStudentEditDraft(null);
          }
        }}>
          <DialogContent className="max-w-2xl rounded-lg">
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>Changes here refresh Student Management, GIS counts, and analytics.</DialogDescription>
            </DialogHeader>
            {studentEditDraft ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <EditField label="Student Number" value={studentEditDraft.studentNumber} onChange={(value) => setStudentEditDraft((draft) => draft && { ...draft, studentNumber: value })} />
                <EditField label="Full Name" value={studentEditDraft.fullName} onChange={(value) => setStudentEditDraft((draft) => draft && { ...draft, fullName: value })} />
                <EditField label="Program / Course" value={studentEditDraft.course} onChange={(value) => setStudentEditDraft((draft) => draft && { ...draft, course: value })} />
                <EditField label="Year Level" value={studentEditDraft.yearLevel} onChange={(value) => setStudentEditDraft((draft) => draft && { ...draft, yearLevel: value })} />
                <EditField label="Last School Attended" value={studentEditDraft.lastSchoolName} onChange={(value) => setStudentEditDraft((draft) => draft && { ...draft, lastSchoolName: value })} />
                <EditField label="Last School Type" value={studentEditDraft.lastSchoolType} onChange={(value) => setStudentEditDraft((draft) => draft && { ...draft, lastSchoolType: value })} />
                <EditField label="Municipality" value={studentEditDraft.municipality} onChange={(value) => setStudentEditDraft((draft) => draft && { ...draft, municipality: value })} />
                <EditField label="Province" value={studentEditDraft.province} onChange={(value) => setStudentEditDraft((draft) => draft && { ...draft, province: value })} />
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</Label>
                  <Select value={studentEditDraft.enrollmentStatus} onValueChange={(value) => setStudentEditDraft((draft) => draft && { ...draft, enrollmentStatus: value })}>
                    <SelectTrigger className="h-9 bg-slate-50 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STUDENT_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Enrollment Date</Label>
                  <Input type="date" className="h-9 bg-slate-50 text-sm" value={studentEditDraft.enrollmentDate} onChange={(event) => setStudentEditDraft((draft) => draft && { ...draft, enrollmentDate: event.target.value })} />
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingStudent(null); setStudentEditDraft(null); }}>Cancel</Button>
              <Button onClick={saveStudentEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </main>
      </Tabs>
    </div>
  );
}

const STUDENT_STATUSES = ["Active", "Enrolled", "Pending", "Dropped", "Transferred", "Graduated", "Archived"];
const STUDENT_SORTS = [
  "Newest",
  "Student Number",
  "Full Name",
  "College",
  "Program",
  "Municipality",
  "Status",
];

type ManagedStudent = StudentProcessed & {
  college: string;
  collegeName: string;
  program: string;
  track: string;
};

function enrichStudentRow(student: StudentProcessed, schools: School[]): ManagedStudent {
  const program = recognizeProgram(student.course);
  const matchedSchool = student.schoolId ? schools.find((school) => school.id === student.schoolId) : undefined;
  return {
    ...student,
    municipality: student.municipality || matchedSchool?.municipality || "Laguna",
    province: student.province || matchedSchool?.province || "Laguna",
    enrollmentStatus: student.enrollmentStatus || "Active",
    importedSource: student.importedSource || "API",
    college: program?.college || "Unknown",
    collegeName: program?.collegeName || "Unknown",
    program: program?.program || student.course || "Unknown",
    track: program?.track || "",
  };
}

function isMapActiveStatus(status?: string | null) {
  return status === "Active" || status === "Enrolled" || !status;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function sortStudents(a: ManagedStudent, b: ManagedStudent, sort: string) {
  if (sort === "Student Number") return a.studentNumber.localeCompare(b.studentNumber);
  if (sort === "Full Name") return a.fullName.localeCompare(b.fullName);
  if (sort === "College") return a.collegeName.localeCompare(b.collegeName) || a.fullName.localeCompare(b.fullName);
  if (sort === "Program") return a.program.localeCompare(b.program) || a.fullName.localeCompare(b.fullName);
  if (sort === "Municipality") return (a.municipality || "").localeCompare(b.municipality || "") || a.fullName.localeCompare(b.fullName);
  if (sort === "Status") return (a.enrollmentStatus || "").localeCompare(b.enrollmentStatus || "") || a.fullName.localeCompare(b.fullName);
  return new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime();
}

function toInputDate(value?: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toStudentCsv(rows: ManagedStudent[]) {
  const headers = [
    "Student Number",
    "Full Name",
    "College",
    "Program",
    "Track",
    "Year Level",
    "Last School Attended",
    "Municipality",
    "Status",
    "Enrollment Date",
    "Imported Source",
  ];
  const body = rows.map((row) => [
    row.studentNumber,
    row.fullName,
    row.collegeName,
    row.program,
    row.track || "General",
    row.yearLevel || "",
    row.lastSchoolName,
    row.municipality || "Laguna",
    row.enrollmentStatus || "Active",
    toInputDate(row.enrollmentDate || row.syncedAt),
    row.importedSource || "API",
  ]);
  return [headers, ...body].map((line) => line.map(csvCell).join(",")).join("\n");
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function studentProfileFields(student: StudentProcessed) {
  const program = recognizeProgram(student.course);
  return [
    { label: "Student Number", value: student.studentNumber },
    { label: "Full Name", value: student.fullName },
    { label: "College", value: program?.collegeName || "Unknown" },
    { label: "Program", value: program?.program || student.course || "Unknown" },
    { label: "Track", value: program?.track || "General" },
    { label: "Year Level", value: student.yearLevel || "Unspecified" },
    { label: "Last School Attended", value: student.lastSchoolName || "Unspecified" },
    { label: "Municipality", value: student.municipality || "Laguna" },
    { label: "Province", value: student.province || "Laguna" },
    { label: "Enrollment Date", value: formatSyncTime(new Date(student.enrollmentDate || student.syncedAt).getTime()) },
    { label: "Status", value: student.enrollmentStatus || "Active" },
    { label: "Imported Source", value: student.importedSource || "API" },
  ];
}

function StudentStat({ title, value, tone = "default" }: { title: string; value: number; tone?: "default" | "emerald" | "sky" | "amber" | "violet" | "slate" }) {
  const toneClass = {
    default: "border-slate-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50",
    sky: "border-sky-200 bg-sky-50",
    amber: "border-amber-200 bg-amber-50",
    violet: "border-violet-200 bg-violet-50",
    slate: "border-slate-200 bg-slate-50",
  }[tone];
  return (
    <div className={cn("rounded-lg border px-3 py-2 shadow-sm", toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value.toLocaleString()}</p>
    </div>
  );
}

function StudentFilterSelect({
  allLabel,
  label,
  onChange,
  value,
  values,
}: {
  allLabel?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
  values: string[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 bg-slate-50 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allLabel ? <SelectItem value={ALL_PROGRAM_FILTER}>{allLabel}</SelectItem> : null}
          {values.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function StudentStatusBadge({ status }: { status?: string | null }) {
  const label = status || "Active";
  const tone = label === "Active" || label === "Enrolled"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : label === "Pending"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : label === "Archived"
        ? "border-slate-200 bg-slate-50 text-slate-600"
        : "border-rose-200 bg-rose-50 text-rose-700";
  return <Badge variant="outline" className={cn("text-[10px]", tone)}>{label}</Badge>;
}

function EditField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</Label>
      <Input className="h-9 bg-slate-50 text-sm" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function StatMini({
  title,
  value,
  sub,
  icon,
  warn,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  warn?: boolean;
}) {
  return (
    <Card className={cn("border border-white/70 bg-white/70 shadow-[0_16px_44px_-38px_rgba(15,23,42,0.42)] backdrop-blur-xl", warn && "border-amber-200/70 bg-amber-50/70")}>
      <CardContent className="flex gap-2 p-3">
        <span className="mt-0.5 text-slate-400">{icon}</span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="truncate text-sm font-semibold tabular-nums text-slate-900">{value}</p>
          {sub ? <p className="truncate text-[10px] text-slate-400">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
