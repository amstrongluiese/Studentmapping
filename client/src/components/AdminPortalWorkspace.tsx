import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend, Label as RechartsLabel } from 'recharts';
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
  ChevronLeft,
  ChevronRight,
  Target, Building2, Folder, RotateCcw,
} from "lucide-react";
import type { Import, SchoolRegistry as School, StudentProcessed } from "@shared/schema";
import { hasCoordinates } from "@shared/schoolRegistry";
import { GEO_BOUNDS } from "@shared/constants";
import { ALL_PROGRAM_FILTER, getFullCatalog, setDynamicCatalog, normalizeStudentProgramValue, recognizeProgram, getDepartmentColor, getPinColorByProgram } from "@shared/programIntelligence";
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
import { SchoolMatchingQueue } from "./SchoolMatchingQueue";
import { DepartmentManagementWorkspace } from "./DepartmentManagementWorkspace";

export type AdminPortalSection = "overview" | "students" | "feed" | "queue" | "registry" | "import-logs" | "targets" | "settings" | "archives";

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
  return [
    { value: "overview", label: "Overview", short: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { value: "students", label: "Students", short: "Students", icon: <Users className="h-4 w-4" /> },
    { value: "registry", label: "School Registry", short: "Registry", icon: <Database className="h-4 w-4" /> },
    { value: "import-logs", label: "Import Logs", short: "Logs", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "targets", label: "Dept Management", short: "Depts", icon: <Building2 className="h-4 w-4" /> },
    { value: "archives", label: "Archives", short: "Archives", icon: <Archive className="h-4 w-4" /> },
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [studentsTab, setStudentsTab] = useState<"directory" | "feed">("directory");
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
  const [studentMappingFilter, setStudentMappingFilter] = useState(ALL_PROGRAM_FILTER);
  const [studentSort, setStudentSort] = useState("Newest");
  const [studentPage, setStudentPage] = useState(1);
  const [isStudentBulkAction, setIsStudentBulkAction] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<StudentProcessed | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentProcessed | null>(null);
  const [studentEditDraft, setStudentEditDraft] = useState<StudentEditDraft | null>(null);

  const [queueSearch, setQueueSearch] = useState("");
  const [queueSelected, setQueueSelected] = useState<Set<number>>(new Set());

  const [logsSearch, setLogsSearch] = useState("");
  const [logsSelected, setLogsSelected] = useState<Set<number>>(new Set());
  const [isDeletingLogs, setIsDeletingLogs] = useState(false);

  const [selectedArchiveFolder, setSelectedArchiveFolder] = useState<string | null>(null);

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
    void queryClient.invalidateQueries({ queryKey: ["/api/schoolRegistry"] });
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

  const { data: dynamicProgs } = useQuery({ queryKey: ["/api/programs"] });
  if (dynamicProgs) {
    setDynamicCatalog(dynamicProgs as any);
  }

  const { data: studentsRaw } = useQuery<StudentProcessed[]>({ queryKey: ["/api/students"] });

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

  const archiveAllData = async () => {
    if (!confirm("Are you sure you want to archive all current student data? This will reset the active dashboard.")) return;
    try {
      const res = await apiRequest("POST", "/api/students/processed/archive-all");
      const data = await res.json();
      if (data.success) {
        toast({ title: "Data Archived", description: data.message });
        void queryClient.invalidateQueries({ queryKey: ["/api/students/processed"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/gis/overview"] });
      } else {
        toast({ title: "Archive Failed", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Archive Failed", description: String(e), variant: "destructive" });
    }
  };

  const overview = useMemo(() => {
    const verifiedSchools = gisOverview?.verifiedSchools ?? schools.filter((s) => s.isActive && hasCoordinates(s)).length;
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
    colleges: uniqueSorted([...getFullCatalog().map((program) => program.college), ...studentRows.map((row) => row.college)].filter(Boolean)),
    programs: uniqueSorted([...getFullCatalog().map((program) => program.program), ...studentRows.map((row) => row.program)].filter(Boolean)),
    tracks: uniqueSorted([...getFullCatalog().map((program) => program.track || "General"), ...studentRows.map((row) => row.track || "General")]),
    years: uniqueSorted(studentRows.map((row) => row.yearLevel || "Unspecified")),
    municipalities: uniqueSorted(studentRows.map((row) => row.municipality || "Laguna")),
    statuses: STUDENT_STATUSES,
    mappingStatuses: ["Mapped", "Unmapped & Distant"],
  }), [studentRows]);

  const studentStats = useMemo(() => {
    const active = studentRows.filter((row) => isMapActiveStatus(row.enrollmentStatus)).length;
    const archived = studentRows.filter((row) => row.enrollmentStatus === "Archived").length;
    const mapped = studentRows.filter((row) => row.schoolRegistryId && row.mappingStatus !== "needs_review" && row.mappingStatus !== "pending").length;
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

  const chartData = useMemo(() => {
    // 1. Admission Demographics (Pie Chart)
    const admissionMap = new Map<string, number>();
    studentRows.forEach(s => {
      if (s.enrollmentStatus === "Archived") return;
      const type = s.admissionType || "Unknown";
      admissionMap.set(type, (admissionMap.get(type) || 0) + 1);
    });
    const admissionDemographics = Array.from(admissionMap.entries()).map(([name, value]) => ({ name, value }));
    const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

    // 2. Top Programs (Bar Chart)
    const programMap = new Map<string, number>();
    const deptMap = new Map<string, number>();
    studentRows.forEach(s => {
      if (s.enrollmentStatus === "Archived") return;
      if (s.program && s.program !== "Unknown") {
        programMap.set(s.program, (programMap.get(s.program) || 0) + 1);
      }
      if (s.college && s.college !== "Unknown") {
        deptMap.set(s.college, (deptMap.get(s.college) || 0) + 1);
      }
    });
    const topPrograms = Array.from(programMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
      
    const topDepartments = Array.from(deptMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    // Standalone Programs
    const standaloneProgramMap = new Map<string, number>();
    studentRows.forEach(s => {
      if (s.enrollmentStatus === "Archived") return;
      if (s.college && s.college.toLowerCase().includes("standalone") && s.program && s.program !== "Unknown") {
        standaloneProgramMap.set(s.program, (standaloneProgramMap.get(s.program) || 0) + 1);
      }
    });

    const topStandalonePrograms = Array.from(standaloneProgramMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 Standalone Programs

    // 3. Geographic Distribution (Bar Chart)
    const geoMap = new Map<string, number>();
    studentRows.forEach(s => {
      if (s.enrollmentStatus === "Archived") return;
      const mun = s.municipality || "Laguna";
      geoMap.set(mun, (geoMap.get(mun) || 0) + 1);
    });
    const geoDistribution = Array.from(geoMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    // 4. Enrollment Trends (Area Chart - mock grouping by last 7 days)
    const trendMap = new Map<string, number>();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      trendMap.set(d.toISOString().slice(0, 10), 0);
    }
    studentRows.forEach(s => {
      if (s.enrollmentStatus === "Archived") return;
      const dStr = new Date(s.syncedAt).toISOString().slice(0, 10);
      if (trendMap.has(dStr)) {
        trendMap.set(dStr, trendMap.get(dStr)! + 1);
      }
    });
    const enrollmentTrends = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

    // 5. Top Feeder Schools (Bar Chart)
    const feederMap = new Map<string, number>();
    studentRows.forEach(s => {
      if (s.enrollmentStatus === "Archived") return;
      const matchedSchool = s.schoolRegistryId ? schools.find(sch => sch.id === s.schoolRegistryId) : null;
      let schoolName = matchedSchool ? matchedSchool.schoolName : (s.lastSchoolName || "Unspecified");
      if (schoolName !== "Unspecified") {
        schoolName = schoolName.replace(/National High School/i, 'NHS')
                               .replace(/Integrated National High School/i, 'INHS')
                               .replace(/Senior High School/i, 'SHS');
        feederMap.set(schoolName, (feederMap.get(schoolName) || 0) + 1);
      }
    });
    const topFeederSchools = Array.from(feederMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    // 6. Year Level Distribution (Donut Chart)
    const yearMap = new Map<string, number>();
    studentRows.forEach(s => {
      if (s.enrollmentStatus === "Archived") return;
      let yr = s.yearLevel || "Unspecified";
      if (yr.includes("1") || yr.toLowerCase().includes("first")) yr = "1st Year";
      else if (yr.includes("2") || yr.toLowerCase().includes("second")) yr = "2nd Year";
      else if (yr.includes("3") || yr.toLowerCase().includes("third")) yr = "3rd Year";
      else if (yr.includes("4") || yr.toLowerCase().includes("fourth")) yr = "4th Year";
      yearMap.set(yr, (yearMap.get(yr) || 0) + 1);
    });
    const yearLevelDistribution = Array.from(yearMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // 7. Geographic Information System (GIS) Mapping Success
    const mapped = schools.filter(s => hasCoordinates(s)).length;
    const unmapped = schools.filter(s => !hasCoordinates(s)).length;
    const mappingProgress = [
      { name: 'Mapped (With Coordinates)', value: mapped, fill: '#10b981' },
      { name: 'Unmapped / Missing', value: unmapped, fill: '#f43f5e' }
    ];

    return { admissionDemographics, COLORS, topPrograms, topDepartments, topStandalonePrograms, geoDistribution, enrollmentTrends, topFeederSchools, yearLevelDistribution, mappingProgress };
  }, [studentRows, schools]);

  const archiveFolders = useMemo(() => {
    const folders = new Map<string, number>();
    studentRows.forEach(s => {
      if (s.enrollmentStatus === "Archived") {
        const dateStr = s.archivedAt ? toInputDate(s.archivedAt) : (s.processedAt ? toInputDate(s.processedAt) : toInputDate(s.syncedAt));
        folders.set(dateStr, (folders.get(dateStr) || 0) + 1);
      }
    });
    return Array.from(folders.entries())
      .map(([date, count]) => ({ date, count, label: `Enrollment Data - ${date}` }))
      .sort((a, b) => b.date.localeCompare(a.date));
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
      .filter((row) => {
        if (studentMappingFilter === ALL_PROGRAM_FILTER) return true;
        const matchedSchool = row.schoolRegistryId ? schools.find(s => s.id === row.schoolRegistryId) : null;
        const isMapped = matchedSchool && hasCoordinates(matchedSchool) && 
                         matchedSchool.latitude >= GEO_BOUNDS.LAGUNA.minLat && matchedSchool.latitude <= GEO_BOUNDS.LAGUNA.maxLat && 
                         matchedSchool.longitude >= GEO_BOUNDS.LAGUNA.minLng && matchedSchool.longitude <= GEO_BOUNDS.LAGUNA.maxLng;
        if (studentMappingFilter === "Mapped") return isMapped;
        if (studentMappingFilter === "Unmapped & Distant") return !isMapped;
        return true;
      })
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
    studentMappingFilter,
    studentSort,
    schools,
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
            !s.isActive ||
            !hasCoordinates(s),
        ),
    [schools, duplicateIds],
  );

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
        <aside className={cn("shrink-0 h-full overflow-hidden rounded-2xl border border-white/20 bg-white/40 p-1.5 shadow-lg backdrop-blur-xl md:p-2 transition-all duration-300 ease-in-out relative flex flex-col", isSidebarCollapsed ? "md:w-16" : "md:w-60")}>
          <div className={cn("hidden md:flex w-full pt-1 pb-2 shrink-0", isSidebarCollapsed ? "justify-center" : "justify-end px-2")}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-white/50 text-slate-500 transition-colors border-0 outline-none focus-visible:ring-0 focus:outline-none"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" strokeWidth={3} /> : <ChevronLeft className="h-4 w-4" strokeWidth={3} />}
            </Button>
          </div>
          <TabsList
            aria-label="Admin sections"
            className={cn(
              "flex w-full gap-1 p-1 text-muted-foreground",
              "flex-row overflow-x-auto overflow-y-hidden",
              "md:flex-col md:flex-1 md:h-full md:overflow-hidden md:!bg-transparent md:p-0 md:shadow-none md:border-none",
              isSidebarCollapsed && "md:items-center"
            )}
          >
            {navItems.map(({ value, label, short, icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                data-tab-id={value}
                title={isSidebarCollapsed ? label : undefined}
                className={cn(
                  "group relative flex items-center shrink-0 rounded-xl border border-transparent text-xs font-semibold text-muted-foreground shadow-none transition-all duration-300 ease-in-out",
                  "hover:bg-slate-200/50 hover:text-slate-900",
                  "data-[state=active]:border-primary/25 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_14px_34px_-24px_rgba(123,17,19,0.9)]",
                  "px-3 py-2",
                  isSidebarCollapsed ? "md:w-10 md:h-10 md:px-0 md:py-0 md:justify-center" : "md:w-full md:h-10 md:justify-start md:px-3 md:py-2 gap-2",
                  value === "settings" && "md:mt-auto"
                )}
              >
                <span className={cn("grid h-7 shrink-0 place-items-center rounded-lg bg-transparent text-muted-foreground transition-all duration-300 group-data-[state=active]:text-white", isSidebarCollapsed ? "w-full" : "w-7")}>
                  {icon}
                </span>
                <div className={cn(
                  "flex items-center whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out",
                  isSidebarCollapsed ? "max-w-0 opacity-0 hidden md:block" : "max-w-[150px] opacity-100"
                )}>
                  <span className="md:hidden">{short}</span>
                  <span className="hidden md:inline">{label}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </aside>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">

          <TabsContent value="overview" className="m-0 mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
                
                {/* Header Section */}
                <div className="flex flex-col gap-4 rounded-xl border border-white/60 bg-white/40 p-5 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Overview</h1>
                    <p className="text-sm text-slate-500">Real-time statistics and enrollment analytics.</p>
                  </div>
                  <Button variant="destructive" onClick={archiveAllData} className="gap-2 shadow-sm transition-transform active:scale-95">
                    <Archive className="h-4 w-4" />
                    Reset / Archive Data
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  <StatMini title="Total students synced" value={overview.totalStudentsSynced.toLocaleString()} icon={<GraduationCap className="h-4 w-4 text-emerald-500" />} />
                  <StatMini title="Freshmen" value={String(overview.freshmenCount)} sub="SHS → Frosh" icon={<UserCircle2 className="h-4 w-4 text-blue-500" />} />
                  <StatMini title="Transferees" value={String(overview.transfereeCount)} sub="College → Xfer" icon={<ArrowRightLeft className="h-4 w-4 text-purple-500" />} />
                  <StatMini title="Verified schools" value={String(overview.verifiedSchools)} icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />} />
                  <StatMini title="Unmapped schools" value={String(overview.unmappedSchools)} warn={overview.unmappedSchools > 0} icon={<MapPinned className="h-4 w-4 text-rose-500" />} />
                  <StatMini title="API sync status" value={overview.apiSyncStatus.replace('GIS', 'Geographic Information System (GIS)')} icon={<CloudOff className="h-4 w-4 text-slate-400" />} />
                  <StatMini title="Last sync" value={formatSyncTime(schoolsUpdatedAt)} sub="Registry data" icon={<Clock3 className="h-4 w-4 text-amber-500" />} />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Admission Demographics */}
                  <Card className="border-white/70 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-sm font-semibold text-slate-800">Admission Demographics</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72 px-2 pb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData.admissionDemographics} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={90} label={{ fontSize: 11, fill: '#64748b' }} stroke="none">
                            {chartData.admissionDemographics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={chartData.COLORS[index % chartData.COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Year Level Distribution */}
                  <Card className="border-white/70 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-sm font-semibold text-slate-800">Year Level Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72 px-2 pb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData.yearLevelDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={90} label={{ fontSize: 11, fill: '#64748b' }} stroke="none">
                            {chartData.yearLevelDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={chartData.COLORS[index % chartData.COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top Departments */}
                  <Card className="border-white/70 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-sm font-semibold text-slate-800">Top Departments</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72 px-4 pb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.topDepartments} layout="vertical" margin={{ left: 50, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                            {chartData.topDepartments.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getDepartmentColor(entry.name)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top Feeder Schools */}
                  <Card className="border-white/70 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-sm font-semibold text-slate-800">Top Feeder Schools</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72 px-4 pb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.topFeederSchools} layout="vertical" margin={{ left: 100, right: 20 }}>
                          <defs>
                            <linearGradient id="feederGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="#fbbf24" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                          <Bar dataKey="count" fill="url(#feederGradient)" radius={[0, 6, 6, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Geographic Distribution */}
                  <Card className="border-white/70 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-sm font-semibold text-slate-800">Top Municipalities</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72 px-4 pb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.geoDistribution} margin={{ top: 10, bottom: 20 }}>
                          <defs>
                            <linearGradient id="geoGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38bdf8" />
                              <stop offset="100%" stopColor="#0284c7" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-25} textAnchor="end" height={40} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                          <Bar dataKey="count" fill="url(#geoGradient)" radius={[6, 6, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* School Mapping Status */}
                  <Card className="border-white/70 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-sm font-semibold text-slate-800">School Mapping Status</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72 px-2 pb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            <linearGradient id="mappedGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#34d399" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <linearGradient id="unmappedGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#fb7185" />
                              <stop offset="100%" stopColor="#e11d48" />
                            </linearGradient>
                            <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" />
                            </filter>
                          </defs>
                          <Pie 
                            data={chartData.mappingProgress} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={65} 
                            outerRadius={90} 
                            paddingAngle={5}
                            stroke="none"
                            cornerRadius={4}
                          >
                            {chartData.mappingProgress.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={index === 0 ? "url(#mappedGradient)" : "url(#unmappedGradient)"}
                                filter="url(#pieShadow)" 
                              />
                            ))}
                            <RechartsLabel
                              content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox && viewBox.cx !== undefined && viewBox.cy !== undefined) {
                                  const total = chartData.mappingProgress[0].value + chartData.mappingProgress[1].value;
                                  const mapped = chartData.mappingProgress[0].value;
                                  const percentage = total > 0 ? Math.round((mapped / total) * 100) : 0;
                                  return (
                                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                      <tspan x={viewBox.cx} y={viewBox.cy - 4} className="fill-slate-700 text-2xl font-bold">
                                        {percentage}%
                                      </tspan>
                                      <tspan x={viewBox.cx} y={viewBox.cy + 16} className="fill-slate-500 text-[10px] font-medium uppercase tracking-wider">
                                        Mapped
                                      </tspan>
                                    </text>
                                  );
                                }
                                return null;
                              }}
                            />
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Standalone Top Programs */}
                  <Card className="border-white/70 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl lg:col-span-2">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-sm font-semibold text-slate-800">
                        Top Standalone Program: {chartData.topStandalonePrograms[0]?.name || "N/A"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-72 px-4 pb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.topStandalonePrograms} layout="vertical" margin={{ left: 50, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                            {chartData.topStandalonePrograms.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getPinColorByProgram(entry.name)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Enrollment Trends */}
                  <Card className="border-white/70 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl lg:col-span-2">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-sm font-semibold text-slate-800">Sync Trends (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72 px-4 pb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.enrollmentTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11, fill: '#64748b' }} 
                            axisLine={false} 
                            tickLine={false} 
                            tickFormatter={(val) => {
                              const d = new Date(val);
                              return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
                            }} 
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                          <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#trendGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
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

              {/* Sub-tabs Switcher */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setStudentsTab("directory")}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold border-b-2 transition-colors focus:outline-none",
                    studentsTab === "directory"
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  )}
                >
                  Student Directory
                </button>
                <button
                  type="button"
                  onClick={() => setStudentsTab("feed")}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold border-b-2 transition-colors focus:outline-none",
                    studentsTab === "feed"
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  )}
                >
                  Live Sync Feed
                </button>
              </div>

              {studentsTab === "directory" ? (
                <>
                  <div className="flex flex-col gap-2 rounded-xl border border-white/50 bg-white/50 p-3 shadow-sm backdrop-blur-md">
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
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                      <StudentFilterSelect label="College" value={studentCollegeFilter} values={studentOptions.colleges} allLabel="All Colleges" onChange={(value) => { setStudentCollegeFilter(value); setStudentPage(1); }} />
                      <StudentFilterSelect label="Program" value={studentProgramFilter} values={studentOptions.programs} allLabel="All Programs" onChange={(value) => { setStudentProgramFilter(value); setStudentPage(1); }} />
                      <StudentFilterSelect label="Track" value={studentTrackFilter} values={studentOptions.tracks} allLabel="All Tracks" onChange={(value) => { setStudentTrackFilter(value); setStudentPage(1); }} />
                      <StudentFilterSelect label="Year" value={studentYearFilter} values={studentOptions.years} allLabel="All Years" onChange={(value) => { setStudentYearFilter(value); setStudentPage(1); }} />
                      <StudentFilterSelect label="Municipality" value={studentMunicipalityFilter} values={studentOptions.municipalities} allLabel="All Municipalities" onChange={(value) => { setStudentMunicipalityFilter(value); setStudentPage(1); }} />
                      <StudentFilterSelect label="Status" value={studentStatusFilter} values={studentOptions.statuses} allLabel="All Statuses" onChange={(value) => { setStudentStatusFilter(value); setStudentPage(1); }} />
                      <StudentFilterSelect label="Mapping" value={studentMappingFilter} values={studentOptions.mappingStatuses} allLabel="All Mapping" onChange={(value) => { setStudentMappingFilter(value); setStudentPage(1); }} />
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
                </>
              ) : (
                <>
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
                  <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-slate-200 shadow-sm">
                    <CardHeader className="shrink-0 border-b border-slate-100 py-3">
                      <CardTitle className="text-sm font-semibold">Live student feed</CardTitle>
                    </CardHeader>
                    <div className="min-h-0 flex-1 overflow-auto">
                      <Table className="min-w-[800px] text-xs">
                        <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(241_245_249)]">
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
                            <TableHead className="font-semibold uppercase text-[10px]">Student</TableHead>
                            <TableHead className="hidden font-semibold uppercase text-[10px] sm:table-cell">Course</TableHead>
                            <TableHead className="hidden font-semibold uppercase text-[10px] md:table-cell">Raw School</TableHead>
                            <TableHead className="font-semibold uppercase text-[10px]">Matched To</TableHead>
                            <TableHead className="hidden font-semibold uppercase text-[10px] lg:table-cell">Type</TableHead>
                            <TableHead className="hidden font-semibold uppercase text-[10px] lg:table-cell">Status</TableHead>
                            <TableHead className="hidden font-semibold uppercase text-[10px] lg:table-cell">Synced</TableHead>
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
                              const matchedSchool = st.schoolRegistryId ? schools.find(s => s.id === st.schoolRegistryId) : null;
                              const matchedSchoolName = matchedSchool?.schoolName || null;

                              return (
                                <TableRow key={st.id} className="hover:bg-slate-50/50" data-state={feedSelected.has(st.id) ? "selected" : undefined}>
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
                </>
              )}
            </div>
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
                  <CardContent className="overflow-x-auto">
                    <Table className="min-w-[600px]">
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

          <TabsContent value="targets" className="m-0 mt-0 min-h-0 flex-1 flex-col overflow-y-auto data-[state=inactive]:hidden bg-slate-50/50">
            <DepartmentManagementWorkspace />
          </TabsContent>

          <TabsContent value="settings" className="m-0 mt-0 min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <div className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-2">
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
          <TabsContent value="archives" className="m-0 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Archived Students</h2>
                  <p className="text-sm text-slate-500">Historical records of previously enrolled students.</p>
                </div>
              </div>

              {!selectedArchiveFolder ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {archiveFolders.map(folder => (
                    <Card key={folder.date} className="relative cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSelectedArchiveFolder(folder.date)}>
                      <div className="absolute top-2 right-2 flex gap-1 z-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-600 hover:bg-emerald-100"
                          title="Restore Folder"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm(`Restore all students from ${folder.label}?`)) return;
                            const folderStudents = studentRows.filter(s => s.enrollmentStatus === "Archived" && (s.archivedAt ? toInputDate(s.archivedAt) : (s.processedAt ? toInputDate(s.processedAt) : toInputDate(s.syncedAt))) === folder.date);
                            updateStudentStatusByIds(folderStudents.map(s => s.id), "Active");
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-600 hover:bg-rose-100"
                          title="Delete Folder"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm(`Permanently delete all students from ${folder.label}? This cannot be undone.`)) return;
                            const folderStudents = studentRows.filter(s => s.enrollmentStatus === "Archived" && (s.archivedAt ? toInputDate(s.archivedAt) : (s.processedAt ? toInputDate(s.processedAt) : toInputDate(s.syncedAt))) === folder.date);
                            deleteStudentsByIds(folderStudents.map(s => s.id));
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <CardContent className="flex flex-col items-center justify-center space-y-2 p-6 text-center">
                        <Folder className="h-10 w-10 text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-800">{folder.label}</h3>
                        <p className="text-xs text-slate-500">{folder.count} students</p>
                      </CardContent>
                    </Card>
                  ))}
                  {archiveFolders.length === 0 && (
                    <div className="col-span-full flex h-32 items-center justify-center text-slate-500">
                      No archived folders found.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Button variant="outline" className="w-fit gap-2" onClick={() => setSelectedArchiveFolder(null)}>
                      <ChevronLeft className="h-4 w-4" /> Back to Folders
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => {
                        if (!confirm(`Restore all students from ${selectedArchiveFolder}?`)) return;
                        const folderStudents = studentRows.filter(s => s.enrollmentStatus === "Archived" && (s.archivedAt ? toInputDate(s.archivedAt) : (s.processedAt ? toInputDate(s.processedAt) : toInputDate(s.syncedAt))) === selectedArchiveFolder);
                        updateStudentStatusByIds(folderStudents.map(s => s.id), "Active");
                        setSelectedArchiveFolder(null);
                      }}>
                        <RotateCcw className="h-4 w-4" /> Restore Folder
                      </Button>
                      <Button variant="outline" className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => {
                        if (!confirm(`Permanently delete all students from ${selectedArchiveFolder}? This cannot be undone.`)) return;
                        const folderStudents = studentRows.filter(s => s.enrollmentStatus === "Archived" && (s.archivedAt ? toInputDate(s.archivedAt) : (s.processedAt ? toInputDate(s.processedAt) : toInputDate(s.syncedAt))) === selectedArchiveFolder);
                        deleteStudentsByIds(folderStudents.map(s => s.id));
                        setSelectedArchiveFolder(null);
                      }}>
                        <Trash2 className="h-4 w-4" /> Delete Folder
                      </Button>
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <ScrollArea className="flex-1">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur">
                          <TableRow>
                            <TableHead className="w-[120px]">Student #</TableHead>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Program</TableHead>
                            <TableHead>Archived Date</TableHead>
                            <TableHead className="w-[120px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentRows
                            .filter(s => s.enrollmentStatus === "Archived" && (s.archivedAt ? toInputDate(s.archivedAt) : (s.processedAt ? toInputDate(s.processedAt) : toInputDate(s.syncedAt))) === selectedArchiveFolder)
                            .map((student) => (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium text-slate-900">{student.studentNumber}</TableCell>
                              <TableCell>{student.fullName}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="truncate">{student.program}</span>
                                  {student.collegeName !== "Unknown" && <span className="text-[10px] text-slate-500">{student.collegeName}</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-500">
                                {toInputDate(student.archivedAt || student.processedAt || student.syncedAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => updateStudentStatusByIds([student.id], "Active")} title="Restore to Active">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => startEditStudent(student)} title="Edit student details">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-700" onClick={() => deleteStudentsByIds([student.id])} title="Permanently Delete">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

        </main>
      </Tabs>
    </div>
  );
}

const STUDENT_STATUSES = ["Active", "Enrolled", "Officially Enrolled", "OE", "NOE", "Pending", "Dropped", "Transferred", "Graduated", "Archived"];
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

function cleanMunicipality(raw: string | null | undefined): string {
  if (!raw) return "Laguna";
  const lower = raw.toLowerCase();
  if (lower.includes("biñan") || lower.includes("binan")) return "Biñan";
  if (lower.includes("santa rosa") || lower.includes("sta. rosa") || lower.includes("sta rosa")) return "Santa Rosa";
  if (lower.includes("san pedro")) return "San Pedro";
  if (lower.includes("calamba")) return "Calamba";
  if (lower.includes("cabuyao")) return "Cabuyao";
  if (lower.includes("carmona")) return "Carmona";
  if (lower.includes("dasma") || lower.includes("dasmarinas")) return "Dasmariñas";
  if (lower.includes("silang")) return "Silang";
  if (lower.includes("muntinlupa")) return "Muntinlupa";
  if (lower.includes("manila")) return "Metro Manila";
  if (lower.includes("laguna")) return "Laguna";
  return raw.replace(/,\s*(Laguna|Philippines)$/i, '').trim() || "Laguna";
}

function enrichStudentRow(student: StudentProcessed, schools: School[]): ManagedStudent {
  const program = recognizeProgram(student.course);
  const matchedSchool = student.schoolRegistryId ? schools.find((school) => school.id === student.schoolRegistryId) : undefined;
  
  // Prioritize clean registry municipality, fallback to cleaned raw student municipality
  const finalMunicipality = matchedSchool?.municipality || cleanMunicipality(student.municipality);
  
  return {
    ...student,
    municipality: finalMunicipality,
    province: matchedSchool?.province || student.province || "Laguna",
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
