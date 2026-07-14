import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  Edit,
  ExternalLink,
  GraduationCap,
  KeyRound,
  Layers,
  Map as MapIcon,
  MapPin,
  MonitorPlay,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Settings2,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";
import { api } from "@shared/routes";
import type { Referral, ReferralInput, SchoolRegistry, Student } from "@shared/schema";
import { getSchoolStatus, hasCoordinates, normalizeSchoolName } from "@shared/schoolRegistry";
import {
  ALL_PROGRAM_FILTER,
  buildProgramAnalytics,
  buildProgramSchools,
  getProgramOptions,
  programFilterIsActive,
  getProgramInfo,
  isStudentActiveForProgramGis,
  type ProgramAnalytics,
  type ProgramFilters,
} from "@shared/programIntelligence";
import { AdminPortalWorkspace, type AdminPortalSection } from "@/components/AdminPortalWorkspace";
import { AdminSchoolRegistry } from "@/components/AdminSchoolRegistry";
import { ApiSettingsCenter } from "@/components/ApiSettingsCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme, type ThemePreference } from "@/components/theme-provider";
import MapWrapper, {
  DEFAULT_MAP_DISPLAY_SETTINGS,
  type AnalyticsVisibility,
  type DrawDisplaySettings,
  type MapDisplaySettings,
  type SchoolCluster,
} from "@/components/MapWrapper";
import { SchoolFormDialog } from "@/components/SchoolFormDialog";
import { useDeleteSchool, useSchools, useUpdateSchool } from "@/hooks/use-schools";
import { useGisOverview, useImportLogs, useProcessedStudents } from "@/hooks/use-gis-admin";
import { useCreateReferral, useDeleteReferral, useReferrals, useUpdateReferral } from "@/hooks/use-referrals";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exitFullscreenSafe, getFullscreenElement, requestFullscreenOnElement } from "@/lib/presentationFullscreen";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const STORAGE_PREFIX = "trimex-gis-core";

const defaultAnalyticsVisibility: AnalyticsVisibility = {
  densityLegend: true,
  schoolStats: false,
  municipalitySummary: false,
  enrollmentOverlay: false,
  heatmap: false,
  charts: false,
  summaryBadge: true,
  summaryFeederCount: true,
  summaryEnrollmentTotal: true,
  floatingPanels: true,
};

const defaultMapSettings: MapDisplaySettings = DEFAULT_MAP_DISPLAY_SETTINGS;

const defaultDrawSettings: DrawDisplaySettings = {
  showDrawings: true,
  lockDrawingMode: false,
  annotationVisibility: true,
};

const defaultPresentationSettings = {
  cleanFullscreen: true,
  markerOnly: false,
};

const defaultImportSettings = {
  autoGeocode: true,
  saveDataset: true,
  skipDuplicates: true,
};

const defaultSystemSettings = {
  theme: "light" as "light" | "dark",
  compactMode: false,
};

type MainTab = "map" | "admin" | "referrals";

export default function Dashboard() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const schoolsQuery = useSchools();
  const schools = schoolsQuery.data || [];
  const isLoading = schoolsQuery.isLoading;
  const lastUpdatedMs = schoolsQuery.dataUpdatedAt || 0;
  const { data: referrals = [] } = useReferrals();
  const { data: students = [] } = useQuery<Student[]>({ queryKey: [api.students.list.path] });
  const { data: processedStudents = [] } = useProcessedStudents();
  const { data: gisOverview } = useGisOverview();
  const { data: importLogs = [] } = useImportLogs();
  const { data: enrollmentTargets = [] } = useQuery<{ targetType: string; targetName: string; targetValue: number }[]>({ 
    queryKey: ["/api/enrollment-targets"] 
  });
  const updateSchool = useUpdateSchool();
  const deleteSchool = useDeleteSchool();
  const createReferral = useCreateReferral();
  const updateReferral = useUpdateReferral();
  const deleteReferral = useDeleteReferral();
  const [mainTab, setMainTab] = usePersistentState<MainTab>(`${STORAGE_PREFIX}:main-tab`, "map");
  const [adminTab, setAdminTab] = usePersistentState<AdminPortalSection>(`${STORAGE_PREFIX}:admin-portal-v1`, "overview");
  const [mapSettings, setMapSettings] = usePersistentState<MapDisplaySettings>(`${STORAGE_PREFIX}:map`, defaultMapSettings);
  const [drawSettings, setDrawSettings] = usePersistentState<DrawDisplaySettings>(`${STORAGE_PREFIX}:draw`, defaultDrawSettings);
  const [analyticsVisibility, setAnalyticsVisibility] = usePersistentState<AnalyticsVisibility>(`${STORAGE_PREFIX}:analytics`, defaultAnalyticsVisibility);
  const [presentationSettings, setPresentationSettings] = usePersistentState(`${STORAGE_PREFIX}:presentation`, defaultPresentationSettings);
  const [importSettings, setImportSettings] = usePersistentState(`${STORAGE_PREFIX}:import`, defaultImportSettings);
  const [systemSettings, setSystemSettings] = usePersistentState(`${STORAGE_PREFIX}:system`, { ...defaultSystemSettings, theme: "light" as const });
  const [isPresenting, setIsPresenting] = usePersistentState(`${STORAGE_PREFIX}:presenting`, false);
  const [isTouring, setIsTouring] = usePersistentState(`${STORAGE_PREFIX}:touring`, false);
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState(`${STORAGE_PREFIX}:sidebar-collapsed`, false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Force light theme
    if (theme !== "light") {
      setTheme("light");
    }
  }, [theme, setTheme]);
  const [editingSchool, setEditingSchool] = useState<SchoolRegistry | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [registrySearch, setRegistrySearch] = useState("");
  const [clearDrawSignal, setClearDrawSignal] = useState(0);
  const [programFilters, setProgramFilters] = usePersistentState<ProgramFilters>(`${STORAGE_PREFIX}:program-filters`, {
    college: ALL_PROGRAM_FILTER,
    program: ALL_PROGRAM_FILTER,
    track: ALL_PROGRAM_FILTER,
  });
  const [programSort, setProgramSort] = usePersistentState(`${STORAGE_PREFIX}:program-sort`, "filtered-desc");
  const [selectedCluster, setSelectedCluster] = useState<SchoolCluster | null>(null);

  const presentationStageRef = useRef<HTMLDivElement>(null);
  const presentationBrowserFullscreenRef = useRef(false);
  const isPresentingRef = useRef(isPresenting);
  isPresentingRef.current = isPresenting;
  const mainTabRef = useRef(mainTab);
  mainTabRef.current = mainTab;
  const cleanFullscreenRef = useRef(presentationSettings.cleanFullscreen);
  cleanFullscreenRef.current = presentationSettings.cleanFullscreen;

  const applyPresentation = useCallback(
    (next: boolean) => {
      if (!next) {
        presentationBrowserFullscreenRef.current = false;
        void exitFullscreenSafe();
        setIsPresenting(false);
        return;
      }
      setIsPresenting(true);
    },
    [setIsPresenting],
  );

  useEffect(() => {
    if (!isPresenting || !presentationSettings.cleanFullscreen || mainTab !== "map") return;
    const stage = presentationStageRef.current;
    if (!stage || getFullscreenElement() === stage) return;
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        const ok = await requestFullscreenOnElement(stage);
        if (!cancelled && ok) presentationBrowserFullscreenRef.current = true;
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [isPresenting, mainTab, presentationSettings.cleanFullscreen]);

  useEffect(() => {
    if (!presentationSettings.cleanFullscreen) {
      presentationBrowserFullscreenRef.current = false;
      void exitFullscreenSafe();
    }
  }, [presentationSettings.cleanFullscreen]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!cleanFullscreenRef.current || !isPresentingRef.current || mainTabRef.current !== "map") return;
      if (getFullscreenElement() != null) return;
      if (!presentationBrowserFullscreenRef.current) return;
      presentationBrowserFullscreenRef.current = false;
      setIsPresenting(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange as EventListener);
    };
  }, [setIsPresenting]);

  useEffect(() => {
    if (mainTab !== "map") {
      presentationBrowserFullscreenRef.current = false;
      void exitFullscreenSafe();
    }
  }, [mainTab]);

  const programOptions = useMemo(() => getProgramOptions(processedStudents), [processedStudents]);
  const programSchools = useMemo(
    () => buildProgramSchools(schools, processedStudents, programFilters),
    [processedStudents, programFilters, schools],
  );
  const totalStudents = useMemo(() => {
    return processedStudents.filter((student) => {
      // 1. Check if student is active
      if (!isStudentActiveForProgramGis(student)) return false;

      // 2. Check if matches programFilters
      const info = getProgramInfo(student.course);
      if (!info) return !programFilterIsActive(programFilters);

      if (programFilters.college !== ALL_PROGRAM_FILTER && info.department !== programFilters.college) return false;
      if (programFilters.program !== ALL_PROGRAM_FILTER && info.program !== programFilters.program) return false;
      if (programFilters.track !== ALL_PROGRAM_FILTER && (info.track || "General") !== programFilters.track) return false;
      
      return true;
    }).length;
  }, [processedStudents, programFilters]);

  const programAnalytics = useMemo(() => {
    const analytics = buildProgramAnalytics(programSchools, programFilters);
    return {
      ...analytics,
      totalStudents,
    };
  }, [programFilters, programSchools, totalStudents]);

  const mappedSchools = useMemo(() => programSchools.filter(hasCoordinates), [programSchools]);

  const mappedStudentsCount = useMemo(() => {
    return programSchools
      .filter((school) => {
        if (!hasCoordinates(school)) return false;
        if (school.schoolName === "Unspecified") return false;
        const lat = school.latitude;
        const lng = school.longitude;
        // Coordinates must lie strictly inside Laguna's bounding box
        return lat >= 13.78 && lat <= 14.58 && lng >= 120.88 && lng <= 121.72;
      })
      .reduce((sum, school) => sum + school.filteredStudentCount, 0);
  }, [programSchools]);
  
  const grandTotalStudents = useMemo(() => {
    // Determine which target to show based on filters
    let target = 0;
    
    if (programFilters.program && programFilters.program !== ALL_PROGRAM_FILTER) {
      const pTarget = enrollmentTargets.find(t => t.targetType === "Program" && t.targetName === programFilters.program);
      if (pTarget) target = pTarget.targetValue;
    } else if (programFilters.college && programFilters.college !== ALL_PROGRAM_FILTER) {
      const cTarget = enrollmentTargets.find(t => t.targetType === "Department" && t.targetName === programFilters.college);
      if (cTarget) target = cTarget.targetValue;
    } else {
      const oTarget = enrollmentTargets.find(t => t.targetType === "Overall");
      if (oTarget) target = oTarget.targetValue;
    }

    if (target > 0) return target;

    // Fallback if no target set
    return processedStudents.filter(s => {
      const normalizedStatus = s.enrollmentStatus || "Active";
      return (normalizedStatus === "Active" || normalizedStatus === "Enrolled" || normalizedStatus === "Officially Enrolled" || normalizedStatus === "OE");
    }).length;
  }, [processedStudents, enrollmentTargets, programFilters]);
  const legendOffsetPx = isPresenting || sidebarCollapsed ? 16 : 336;
  const municipalityCount = useMemo(
    () => new Set(programSchools.map((school) => (school.municipality || "").trim()).filter(Boolean)).size,
    [programSchools],
  );
  const sortedProgramSchools = useMemo(() => sortProgramSchools(programSchools, programSort), [programSchools, programSort]);
  const duplicateIds = useMemo(() => findDuplicateSchoolIds(schools), [schools]);
  const filteredSchools = useMemo(() => {
    const query = registrySearch.trim().toLowerCase();
    if (!query) return schools;
    return schools.filter((school) =>
      [school.schoolName, school.municipality, school.schoolType, school.isActive]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [registrySearch, schools]);

  const openAddSchool = useCallback((coords?: { latitude: number; longitude: number }) => {
    setEditingSchool(null);
    setSelectedCoords(coords || null);
    setDialogOpen(true);
  }, []);

  const openEditSchool = useCallback((school: SchoolRegistry) => {
    setEditingSchool(school);
    setSelectedCoords(null);
    setDialogOpen(true);
  }, []);

  const geolocateSchool = async (school: SchoolRegistry) => {
    try {
      const { requestGeocodeSchoolOrThrow } = await import("@/lib/geocodeSchoolApi");
      const municipality = school.municipality?.trim() || undefined;
      const result = await requestGeocodeSchoolOrThrow({
        schoolName: school.schoolName,
        municipality,
      });
      await updateSchool.mutateAsync({
        id: school.id,
        latitude: result.latitude,
        longitude: result.longitude,
        isActive: true,
        source: result.source === "Google Maps" ? "Google Geocoding Manual Assist" : "Geocoding Manual Assist",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to geolocate school.";
      toast({ title: "Geolocation failed", description: message, variant: "destructive" });
    }
  };

  const removeDuplicate = async (school: SchoolRegistry) => {
    if (!duplicateIds.has(school.id)) return;
    if (!confirm(`Remove duplicate registry record for ${school.schoolName}?`)) return;
    await deleteSchool.mutateAsync(school.id);
  };

  const updateMapSetting = <K extends keyof MapDisplaySettings>(key: K, value: MapDisplaySettings[K]) => {
    setMapSettings((current) => ({ ...current, [key]: value }));
  };

  const updateDrawSetting = (key: keyof DrawDisplaySettings, checked: boolean) => {
    setDrawSettings((current) => ({ ...current, [key]: checked }));
  };

  const updateAnalyticsVisibility = (key: keyof AnalyticsVisibility, checked: boolean) => {
    setAnalyticsVisibility((current) => ({ ...current, [key]: checked }));
  };

  return (
    <div
      className={cn(
        "gis-app-shell flex h-full w-full min-h-0 flex-col overflow-hidden bg-background",
        systemSettings.compactMode && "text-sm",
        isPresenting && mainTab === "map" && "dashboard-presentation-root",
      )}
    >
      <header
        className={cn("pointer-events-none fixed inset-x-0 top-0 z-30", isPresenting && "hidden")}
        data-gis-draw-occlude="top"
      >
        <div className="pointer-events-none">
          <div
            className={cn(
              "pointer-events-auto flex h-[60px] w-full shrink-0 items-center justify-between gap-3 border-b border-white/40",
              "bg-white/40 px-3 shadow-sm backdrop-blur-md",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div
                className="grid h-8 w-8 shrink-0 place-items-center text-slate-800"
                aria-hidden
              >
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
              </div>
            </div>
            <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as MainTab)} className="flex shrink-0 items-center">
              <TabsList
                aria-label="Primary navigation"
                className="inline-flex h-9 items-center gap-1 rounded-full border border-white/50 bg-white/50 p-1 text-muted-foreground shadow-sm backdrop-blur-md"
              >
                <TabsTrigger
                  value="map"
                  className="group h-7 gap-1.5 rounded-full border border-transparent px-2.5 py-0 text-[11px] font-semibold leading-none text-muted-foreground transition-all hover:bg-surface hover:text-foreground data-[state=active]:border-primary/25 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_10px_28px_-18px_rgba(123,17,19,0.95)]"
                >
                  <MapIcon className="h-3 w-3 shrink-0 transition-colors" strokeWidth={1.5} />
                  Map
                </TabsTrigger>
                <TabsTrigger
                  value="admin"
                  className="group h-7 gap-1.5 rounded-full border border-transparent px-2.5 py-0 text-[11px] font-semibold leading-none text-muted-foreground transition-all hover:bg-surface hover:text-foreground data-[state=active]:border-primary/25 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_10px_28px_-18px_rgba(123,17,19,0.95)]"
                >
                  <Database className="h-3 w-3 shrink-0 transition-colors" strokeWidth={1.5} />
                  Admin
                </TabsTrigger>
                <TabsTrigger
                  value="referrals"
                  className="group h-7 gap-1.5 rounded-full border border-transparent px-2.5 py-0 text-[11px] font-semibold leading-none text-muted-foreground transition-all hover:bg-surface hover:text-foreground data-[state=active]:border-primary/25 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_10px_28px_-18px_rgba(123,17,19,0.95)]"
                >
                  <UserPlus className="h-3 w-3 shrink-0 transition-colors" strokeWidth={1.5} />
                  Referrals
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative z-[1700] flex min-w-0 flex-1 justify-end">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as MainTab)} className="flex min-h-0 flex-1 flex-col">
        <TabsContent
          value="map"
          className={cn(
            "m-0 flex min-h-0 flex-1 flex-col p-0 data-[state=inactive]:hidden",
            "transition-[padding] duration-300 ease-out motion-reduce:transition-none",
            isPresenting ? "min-h-0 pt-0" : "pt-[60px]",
          )}
        >
            <div
              id="gis-presentation-stage"
              ref={presentationStageRef}
              className={cn(
                "presentation-stage relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100",
                "transition-opacity duration-300 ease-out motion-reduce:transition-none",
                isPresenting && "min-h-[100dvh]",
              )}
            >
            {!mobileSidebarOpen && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-3 top-3 z-[1140] h-9 w-9 rounded-full border border-white/30 bg-white/40 text-slate-800 shadow-md backdrop-blur-md hover:bg-white/50 lg:hidden"
                onClick={() => setMobileSidebarOpen(true)}
                title="Open menu"
                aria-label="Open menu"
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            )}

            {mobileSidebarOpen && (
              <aside
                className="absolute left-0 top-0 z-[1160] flex h-full w-[min(320px,calc(100vw-1rem))] flex-col overflow-y-auto border-r border-white/30 bg-white/40 p-3 shadow-xl backdrop-blur-md lg:hidden"
                data-gis-draw-occlude="left"
              >
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">GIS Stats</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                    onClick={() => setMobileSidebarOpen(false)}
                    title="Close sidebar"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {selectedCluster && (
                    <SelectedClusterPanel
                      cluster={selectedCluster}
                      programFilters={programFilters}
                      onClose={() => setSelectedCluster(null)}
                      onEditSchool={openEditSchool}
                    />
                  )}
                  <Metric label={programFilterIsActive(programFilters) ? "Filtered Enrollees (GIS)" : "Mapped Enrollees (GIS)"} value={totalStudents} />
                  <Metric label={programFilterIsActive(programFilters) ? "Filtered Target" : "Overall Target"} value={grandTotalStudents} />
                  <Metric label="Municipalities" value={municipalityCount} />
                  <AnalyticsInsightPanel analytics={programAnalytics} />
                  <div className="rounded-xl border border-white/50 bg-white/40 px-4 py-3 shadow-sm backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-700/85">Last Updated</p>
                    <p className="mt-1 truncate font-mono text-xs text-slate-900">{lastUpdatedMs ? new Date(lastUpdatedMs).toLocaleString() : "-"}</p>
                  </div>
                  <ProgramFiltersPanel
                    filters={programFilters}
                    options={programOptions}
                    sort={programSort}
                    onFiltersChange={setProgramFilters}
                    onSortChange={setProgramSort}
                  />
                  <ProgramSchoolList schools={sortedProgramSchools} />
                </div>
              </aside>
            )}

            {!sidebarCollapsed && (
              <aside
                className="absolute left-0 top-0 z-[45] hidden h-full w-[320px] flex-col overflow-y-auto border-r border-white/30 bg-white/40 p-3 shadow-sm backdrop-blur-md lg:flex"
                data-gis-draw-occlude="left"
              >
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">GIS Stats</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  onClick={() => setSidebarCollapsed(true)}
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </div>

              <div className="space-y-2.5">
                {selectedCluster && (
                  <SelectedClusterPanel
                    cluster={selectedCluster}
                    programFilters={programFilters}
                    onClose={() => setSelectedCluster(null)}
                    onEditSchool={openEditSchool}
                  />
                )}
                <Metric label="Total Enrollees" value={totalStudents} />
                <Metric label="Mapped Enrollees (GIS)" value={mappedStudentsCount} />
                <Metric label="Unmapped / Distant" value={totalStudents - mappedStudentsCount} />
                <Metric label={programFilterIsActive(programFilters) ? "Filtered Target" : "Overall Target"} value={grandTotalStudents} />
                <Metric label="Municipalities" value={municipalityCount} />
                <AnalyticsInsightPanel analytics={programAnalytics} />
                <div className="rounded-xl border-b-2 border-b-slate-300/80 bg-white px-4 py-3 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.22)] backdrop-blur-[18px]">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-700/85">Last Updated</p>
                  <p className="mt-1 truncate font-mono text-xs text-slate-900">{lastUpdatedMs ? new Date(lastUpdatedMs).toLocaleString() : "—"}</p>
                </div>
                <ProgramFiltersPanel
                  filters={programFilters}
                  options={programOptions}
                  sort={programSort}
                  onFiltersChange={setProgramFilters}
                  onSortChange={setProgramSort}
                />
                <ProgramSchoolList schools={sortedProgramSchools} />
              </div>
            </aside>
            )}

            <main className="relative flex h-full min-h-0 flex-1 flex-col">
              {sidebarCollapsed && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-3 top-3 z-[1140] hidden h-9 w-9 rounded-full border border-white/30 bg-white/40 text-slate-800 shadow-md backdrop-blur-md hover:bg-white/50 lg:inline-flex"
                  onClick={() => setSidebarCollapsed(false)}
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              )}
              
              {isPresenting && sidebarCollapsed && selectedCluster && (
                <div className="absolute left-4 top-4 z-[9999] w-[320px] rounded-xl border border-white/30 bg-white/40 p-0 shadow-lg backdrop-blur-md">
                  <SelectedClusterPanel
                    cluster={selectedCluster}
                    programFilters={programFilters}
                    onClose={() => setSelectedCluster(null)}
                    onEditSchool={openEditSchool}
                  />
                </div>
              )}
              <MapWrapper
                onEditSchool={openEditSchool}
                isPresenting={isPresenting}
                isTouring={isTouring}
                layoutKey={mainTab}
                analyticsVisibility={analyticsVisibility}
                mapSettings={mapSettings}
                drawSettings={drawSettings}
                clearDrawSignal={clearDrawSignal}
                onAnalyticsVisibilityChange={updateAnalyticsVisibility}
                onMapSettingChange={updateMapSetting}
                onDrawSettingChange={updateDrawSetting}
                onPresentationChange={applyPresentation}
                onTouringChange={setIsTouring}
                onMarkerClick={setSelectedCluster}
                onOpenSettings={() => {
                  setMainTab("admin");
                  setAdminTab("settings");
                }}
                schools={sortedProgramSchools}
                programFilters={programFilters}
                programAnalytics={programAnalytics}
                legendOffsetPx={legendOffsetPx}
              />
            </main>
          </div>
        </TabsContent>

        <TabsContent
          value="admin"
          className={cn(
            "m-0 h-full min-h-0 overflow-hidden p-0 data-[state=inactive]:hidden",
            "transition-[padding] duration-300 ease-out motion-reduce:transition-none",
            isPresenting ? "pt-0" : "pt-[60px]",
          )}
        >
          <AdminPortalWorkspace
            duplicateIds={duplicateIds}
            onAddSchool={() => openAddSchool()}
            onDeleteSchool={(school) => deleteSchool.mutate(school.id)}
            onEditSchool={openEditSchool}
            onGeolocateSchool={geolocateSchool}
            onRemoveDuplicate={removeDuplicate}
            onSectionChange={setAdminTab}
            renderGisWorkspaceSettings={() => (
              <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2">
                <SettingsCard icon={<Layers className="h-4 w-4" />} title="Overlays & labels" description="Map readability while operating GIS.">
                  <SettingSwitch label="GIS overlays" checked={mapSettings.overlays} onChange={(checked) => updateMapSetting("overlays", checked)} />
                  <SettingSwitch label="School info labels" checked={mapSettings.schoolLabels} onChange={(checked) => updateMapSetting("schoolLabels", checked)} />
                  <SettingSwitch label="School name labels" checked={mapSettings.schoolNameLabels ?? defaultMapSettings.schoolNameLabels} onChange={(checked) => updateMapSetting("schoolNameLabels", checked)} />
                  <SettingSwitch label="Barangay area labels" checked={mapSettings.barangayLabels} onChange={(checked) => updateMapSetting("barangayLabels", checked)} />
                  <SettingSwitch label="City / municipality labels" checked={mapSettings.cityLabels} onChange={(checked) => updateMapSetting("cityLabels", checked)} />
                  <SettingSwitch label="Basemap place names" checked={mapSettings.basemapPlaceNames} onChange={(checked) => updateMapSetting("basemapPlaceNames", checked)} />
                  <SettingSwitch label="Roads on basemap" checked={mapSettings.roads} onChange={(checked) => updateMapSetting("roads", checked)} />
                  <SettingSwitch label="Minimal basemap" checked={mapSettings.minimalistMode} onChange={(checked) => updateMapSetting("minimalistMode", checked)} />
                  <SettingSwitch label="Dark basemap theme" checked={mapSettings.mapTheme === "dark"} onChange={(checked) => updateMapSetting("mapTheme", checked ? "dark" : "light")} />
                  <SettingSwitch label="Marker clustering" checked={mapSettings.clusters} onChange={(checked) => updateMapSetting("clusters", checked)} />
                  <SettingSwitch label="Program legend" checked={mapSettings.programLegend ?? defaultMapSettings.programLegend} onChange={(checked) => updateMapSetting("programLegend", checked)} />
                </SettingsCard>

                <SettingsCard icon={<MonitorPlay className="h-4 w-4" />} title="Presentation" description="Fullscreen and tour defaults.">
                  <SettingSwitch label="Presentation mode" checked={isPresenting} onChange={applyPresentation} />
                  <SettingSwitch label="Clean fullscreen" checked={presentationSettings.cleanFullscreen} onChange={(checked) => setPresentationSettings((current) => ({ ...current, cleanFullscreen: checked }))} />
                  <SettingSwitch
                    label="Marker-only mode"
                    checked={presentationSettings.markerOnly}
                    onChange={(checked) => {
                      setPresentationSettings((current) => ({ ...current, markerOnly: checked }));
                      updateMapSetting("overlays", !checked);
                    }}
                  />
                  <SettingSwitch label="Guided feeder tour" checked={isTouring} onChange={setIsTouring} />
                </SettingsCard>

                <SettingsCard icon={<Database className="h-4 w-4" />} title="Import behavior" description="Applied when processing admissions rows.">
                  <SettingSwitch label="Auto-geolocate missing schools" checked={importSettings.autoGeocode} onChange={(checked) => setImportSettings((current) => ({ ...current, autoGeocode: checked }))} />
                  <SettingSwitch label="Save local registry dataset" checked={importSettings.saveDataset} onChange={(checked) => setImportSettings((current) => ({ ...current, saveDataset: checked }))} />
                  <SettingSwitch label="Skip duplicate admissions rows" checked={importSettings.skipDuplicates} onChange={(checked) => setImportSettings((current) => ({ ...current, skipDuplicates: checked }))} />
                </SettingsCard>

                <SettingsCard icon={<Palette className="h-4 w-4" />} title="Theme & drawings" description="Workspace density and annotation layer.">
                  <Select
                    name="gisWorkspaceTheme"
                    value={theme}
                    onValueChange={(value) => setTheme(value as ThemePreference)}
                  >
                    <SelectTrigger id="gis-workspace-theme" className="h-9 bg-surface-soft text-sm" aria-label="Theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                  <SettingSwitch label="Compact mode" checked={systemSettings.compactMode} onChange={(checked) => setSystemSettings((current) => ({ ...current, compactMode: checked }))} />
                  <SettingSwitch label="Show drawings" checked={drawSettings.showDrawings} onChange={(checked) => updateDrawSetting("showDrawings", checked)} />
                  <SettingSwitch label="Drawing annotations" checked={drawSettings.annotationVisibility} onChange={(checked) => updateDrawSetting("annotationVisibility", checked)} />
                  <Button variant="outline" className="h-9 w-full gap-2 bg-white text-sm" onClick={() => setClearDrawSignal((signal) => signal + 1)}>
                    <Trash2 className="h-4 w-4" />
                    Clear drawings
                  </Button>
                </SettingsCard>
              </div>
            )}
            renderIntegrationControls={() => <ApiSettingsCenter />}
            renderSchoolRegistry={() => (
              <AdminSchoolRegistry
                compact
                duplicateIds={duplicateIds}
                filteredSchools={filteredSchools}
                isLoading={isLoading}
                registrySearch={registrySearch}
                onAdd={() => openAddSchool()}
                onDelete={(school) => deleteSchool.mutate(school.id)}
                onEdit={openEditSchool}
                onGeolocate={geolocateSchool}
                onRemoveDuplicate={removeDuplicate}
                onSearchChange={setRegistrySearch}
              />
            )}
            gisOverview={gisOverview}
            importLogs={importLogs}
            processedStudents={processedStudents}
            schools={schools}
            schoolsLoading={isLoading}
            schoolsUpdatedAt={lastUpdatedMs}
            section={adminTab}
          />
        </TabsContent>

        <TabsContent
          value="referrals"
          className={cn(
            "m-0 h-full min-h-0 overflow-auto bg-slate-50 p-4 data-[state=inactive]:hidden",
            "transition-[padding] duration-300 ease-out motion-reduce:transition-none",
            isPresenting ? "pt-3" : "pt-[calc(0.5rem+60px+0.75rem)]",
          )}
        >
          <ReferralProgramWorkspace
            createReferral={(input) => createReferral.mutateAsync(input)}
            deleteReferral={(id) => deleteReferral.mutateAsync(id)}
            referrals={referrals}
            students={students}
            updateReferral={(id, updates) => updateReferral.mutateAsync({ id, updates })}
          />
        </TabsContent>
      </Tabs>

      <SchoolFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editingSchool}
        defaultCoordinates={selectedCoords ? { latitude: selectedCoords.latitude, longitude: selectedCoords.longitude } : null}
      />
    </div>
  );
}

function SelectedClusterPanel({
  cluster,
  programFilters,
  onClose,
  onEditSchool,
}: {
  cluster: SchoolCluster;
  programFilters: ProgramFilters;
  onClose: () => void;
  onEditSchool: (school: SchoolRegistry) => void;
}) {
  return (
    <div className="rounded-xl border-transparent bg-transparent overflow-hidden flex flex-col mb-1">
      <div className="flex items-start justify-between border-b border-white/20 bg-white/20 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {cluster.schools.length > 1 ? "School Cluster" : "Feeder School"}
          </p>
          <h4 className="mt-0.5 font-display text-sm font-bold leading-tight text-slate-900">
            {cluster.schools.length > 1 ? `${cluster.schools.length} feeder schools` : cluster.schools[0].name}
          </h4>
        </div>
        <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700" onClick={onClose}>
          <XCircle className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 p-3 max-h-[60vh] overflow-y-auto">
        {cluster.schools.map((school) => (
          <div key={school.id} className="rounded-lg border border-white/30 bg-white/40 p-3 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{school.schoolName}</p>
                <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
                  <MapIcon className="mt-[2px] h-3 w-3 shrink-0" />
                  <span className="leading-snug">{school.municipality || "Laguna"}</span>
                </p>
                <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
                  <Layers className="mt-[2px] h-3 w-3 shrink-0" />
                  <span className="leading-snug">{school.dominantProgram?.collegeName || school.schoolType || "Feeder Institution"}</span>
                </p>
              </div>
              <div className="flex shrink-0 min-w-[3.5rem] flex-col items-center justify-center rounded-lg bg-primary/10 px-2.5 py-1.5 text-center text-primary">
                <p className="text-sm font-black leading-none">{school.filteredStudentCount}</p>
                <p className="mt-1 text-[9px] font-bold uppercase leading-none">Filtered</p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center justify-between border-b border-black/5 pb-1">
                <span className="font-medium text-slate-500">Filtered Students</span>
                <strong className="text-slate-900">{school.filteredStudentCount.toLocaleString()}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-black/5 pb-1">
                <span className="font-medium text-slate-500">Total Students</span>
                <strong className="text-slate-900">{school.totalStudentCount.toLocaleString()}</strong>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="font-medium text-slate-500">Dominant College</span>
                <strong className="truncate max-w-[120px] text-slate-900 ml-2" title={school.dominantProgram?.college || "Unknown"}>
                  {school.dominantProgram?.college || "Unknown"}
                </strong>
              </div>
            </div>
            
            {school.programDistribution.length > 0 && (
              <div className="mt-3 rounded-md border border-white/40 bg-white/50 p-2 shadow-sm">
                <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Program Distribution</p>
                <div className="space-y-1">
                  {school.programDistribution.slice(0, 5).map((entry: any) => (
                    <div key={entry.code} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="truncate">{entry.code}</span>
                      </span>
                      <strong>{entry.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8 w-full gap-2 bg-white"
              onClick={() => onEditSchool(school)}
            >
              <Edit className="h-3.5 w-3.5" />
              Update Record
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SchoolRegistry({
  compact = false,
  duplicateIds,
  filteredSchools,
  isLoading,
  registrySearch,
  onAdd,
  onDelete,
  onEdit,
  onGeolocate,
  onRemoveDuplicate,
  onSearchChange,
}: {
  compact?: boolean;
  duplicateIds: Set<number>;
  filteredSchools: SchoolRegistry[];
  isLoading: boolean;
  registrySearch: string;
  onAdd: () => void;
  onDelete: (school: SchoolRegistry) => void;
  onEdit: (school: SchoolRegistry) => void;
  onGeolocate: (school: SchoolRegistry) => void;
  onRemoveDuplicate: (school: SchoolRegistry) => void;
  onSearchChange: (value: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await apiRequest("POST", "/api/schools/batch-delete", { ids: Array.from(selectedIds) });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: data.message });
        setSelectedIds(new Set());
        void queryClient.invalidateQueries({ queryKey: ["/api/gis/overview"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/mapping/queue"] });
      } else {
        toast({ title: "Delete Error", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Delete Failed", description: String(e), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={cn("mx-auto space-y-3", compact ? "max-w-full" : "max-w-7xl space-y-4")}>
      <TableToolbar
        searchQuery={registrySearch}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search schools, municipalities, type, or status..."
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onDelete={handleBulkDelete}
        isDeleting={isDeleting}
        deleteItemName="schools"
      />
      
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className={cn("font-semibold text-slate-900", compact ? "text-sm" : "text-xl font-black")}>School registry</h3>
          <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-sm")}>
            One GIS entity per school — coordinates, municipality, verification.
          </p>
        </div>
        <Button className={cn("gap-2", compact ? "h-8 px-3 text-xs" : "h-10")} onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add school
        </Button>
      </div>

      <Card className="overflow-hidden rounded-lg border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
        <Table className={cn(compact ? "min-w-[960px] text-xs" : "min-w-[800px]")}>
          <TableHeader>
            <TableRow className={cn(compact && "hover:bg-transparent")}>
              <TableHead className="w-10 px-4">
                <Checkbox 
                  checked={filteredSchools.length > 0 && selectedIds.size === filteredSchools.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedIds(new Set(filteredSchools.map(s => s.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  aria-label="Select all schools"
                />
              </TableHead>
              {compact ? (
                <>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">School</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Normalized</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Lat / Lng</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Municipality</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Province</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-[10px] font-semibold uppercase tracking-wide">Students</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Frosh / Xfer</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Verification</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-[10px] font-semibold uppercase tracking-wide">Actions</TableHead>
                </>
              ) : (
                <>
                  <TableHead>School</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Municipality</TableHead>
                  <TableHead>School Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={compact ? 10 : 7} className="h-24 text-center text-muted-foreground">Loading registry...</TableCell></TableRow>
            ) : filteredSchools.length === 0 ? (
              <TableRow><TableCell colSpan={compact ? 10 : 7} className="h-24 text-center text-muted-foreground">No schools found.</TableCell></TableRow>
            ) : filteredSchools.map((school) => {
              const registryStatus = duplicateIds.has(school.id) ? "Duplicate Entry" : getSchoolStatus(school);
              const actionBtn = compact ? "h-7 w-7" : "h-8 w-8";
              const actionIcon = compact ? "h-3.5 w-3.5" : "h-4 w-4";

              return (
              <TableRow key={school.id} className={cn(compact && "text-[11px]")} data-state={selectedIds.has(school.id) ? "selected" : undefined}>
                <TableCell className="px-4">
                  <Checkbox 
                    checked={selectedIds.has(school.id)}
                    onCheckedChange={(checked) => {
                      const next = new Set(selectedIds);
                      if (checked) next.add(school.id);
                      else next.delete(school.id);
                      setSelectedIds(next);
                    }}
                    aria-label={`Select school ${school.schoolName}`}
                  />
                </TableCell>
                <TableCell className={cn(compact && "max-w-[180px]")}>
                  <p className={cn("font-semibold", compact && "truncate")}>{school.schoolName}</p>
                  {!compact ? (
                    <p className="text-xs text-muted-foreground">{school.schoolType || "Unknown"}</p>
                  ) : (
                    <p className="truncate text-[10px] text-muted-foreground">{school.schoolType}</p>
                  )}
                </TableCell>
                {compact ? (
                  <>
                    <TableCell className="max-w-[140px]">
                      <span className="block truncate font-mono text-[10px] text-slate-600">
                        {school.normalizedSchoolName || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {hasCoordinates(school) ? (
                        <span className="font-mono text-[10px]">{school.latitude!.toFixed(5)}, {school.longitude!.toFixed(5)}</span>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{school.municipality}</TableCell>
                    <TableCell className="whitespace-nowrap text-slate-500">Laguna</TableCell>
                    <TableCell className="text-right tabular-nums">—</TableCell>
                    <TableCell className="whitespace-nowrap text-slate-400">— / —</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", statusTone(school))}>
                        {school.isActive ? "Verified" : registryStatus}
                      </Badge>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      {hasCoordinates(school) ? (
                        <span className="font-mono text-xs">{school.latitude!.toFixed(5)}, {school.longitude!.toFixed(5)}</span>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell>{school.municipality}</TableCell>
                    <TableCell>{school.schoolType}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusTone(school)}>{registryStatus}</Badge>
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <div className="flex justify-end gap-0.5">
                    <Button variant="ghost" size="icon" className={actionBtn} onClick={() => onEdit(school)} title="Edit school">
                      <Edit className={actionIcon} />
                    </Button>
                    <Button variant="ghost" size="icon" className={actionBtn} onClick={() => onGeolocate(school)} title="Re-geolocate school">
                      <RefreshCw className={actionIcon} />
                    </Button>
                    {duplicateIds.has(school.id) && (
                      <Button variant="ghost" size="icon" className={cn(actionBtn, "text-amber-700")} onClick={() => onRemoveDuplicate(school)} title="Remove duplicate">
                        <Trash2 className={actionIcon} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className={cn(actionBtn, "text-rose-600")} onClick={() => onDelete(school)} title="Delete school">
                      <Trash2 className={actionIcon} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}

function ProgramFiltersPanel({
  filters,
  options,
  sort,
  onFiltersChange,
  onSortChange,
}: {
  filters: ProgramFilters;
  options: ReturnType<typeof getProgramOptions>;
  sort: string;
  onFiltersChange: (next: ProgramFilters | ((current: ProgramFilters) => ProgramFilters)) => void;
  onSortChange: (next: string) => void;
}) {
  const active = programFilterIsActive(filters);
  const updateFilter = (key: keyof ProgramFilters, value: string) => {
    onFiltersChange((current) => ({
      ...current,
      [key]: value,
      ...(key === "college" ? { program: ALL_PROGRAM_FILTER, track: ALL_PROGRAM_FILTER } : {}),
      ...(key === "program" ? { track: ALL_PROGRAM_FILTER } : {}),
    }));
  };

  return (
    <div className="rounded-xl border border-white/50 bg-white/40 p-3 shadow-sm backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Program Intelligence</p>
          <p className="text-xs font-semibold text-slate-900">{active ? "Filtered map view" : "All programs"}</p>
        </div>
        {active && (
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={() => onFiltersChange({ college: ALL_PROGRAM_FILTER, program: ALL_PROGRAM_FILTER, track: ALL_PROGRAM_FILTER })}
          >
            Reset
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <SidebarSelect
          label="College"
          value={filters.college}
          onValueChange={(value) => updateFilter("college", value)}
          items={options.colleges}
          allLabel="All Colleges"
        />
        <SidebarSelect
          label="Program"
          value={filters.program}
          onValueChange={(value) => updateFilter("program", value)}
          items={options.programs}
          allLabel="All Programs"
        />
        <SidebarSelect
          label="Track"
          value={filters.track}
          onValueChange={(value) => updateFilter("track", value)}
          items={options.tracks}
          allLabel="All Tracks"
        />
        <SidebarSelect
          label="Sort"
          value={sort}
          onValueChange={onSortChange}
          items={[
            { value: "filtered-desc", label: "Filtered count" },
            { value: "total-desc", label: "Total count" },
            { value: "name-asc", label: "School A-Z" },
            { value: "municipality-asc", label: "Municipality" },
            { value: "college-asc", label: "College / Department" },
          ]}
        />
      </div>
    </div>
  );
}

function SidebarSelect({
  allLabel,
  items,
  label,
  onValueChange,
  value,
}: {
  allLabel?: string;
  items: Array<{ value: string; label: string }>;
  label: string;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 rounded-md border-white/50 bg-white/50 text-xs shadow-sm backdrop-blur-sm hover:bg-white/70">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allLabel && <SelectItem value={ALL_PROGRAM_FILTER}>{allLabel}</SelectItem>}
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ProgramSchoolList({ schools }: { schools: any[] }) {
  return (
    <div className="rounded-xl border border-white/50 bg-white/40 p-3 shadow-sm backdrop-blur-md">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Schools</p>
      <div className="max-h-[310px] space-y-1.5 overflow-y-auto pr-1">
        {schools.length === 0 ? (
          <p className="rounded-md border border-white/40 bg-white/50 px-2 py-3 text-center text-xs text-slate-500 shadow-sm backdrop-blur-sm">No schools match the active filters.</p>
        ) : (
          schools.slice(0, 80).map((school) => (
            <div key={school.id} className="flex items-center gap-2 rounded-md border border-white/40 bg-white/50 px-2 py-2 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/70">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: school.dominantProgram?.color || "#cbd5e1" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">{school.schoolName}</p>
                <p className="truncate text-[10px] text-slate-500">{school.municipality || "Laguna"} · {school.dominantProgram?.code || "Unknown"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-black text-slate-900">{school.filteredStudentCount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">of {school.totalStudentCount.toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReferralProgramWorkspace({
  createReferral,
  deleteReferral,
  referrals,
  students,
  updateReferral,
}: {
  createReferral: (input: ReferralInput) => Promise<unknown>;
  deleteReferral: (id: number) => Promise<unknown>;
  referrals: Referral[];
  students: Student[];
  updateReferral: (id: number, updates: Partial<ReferralInput>) => Promise<unknown>;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReferrerId, setSelectedReferrerId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [notes, setNotes] = useState("");
  const studentsById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const publicReferralUrl = `${window.location.origin}${window.location.pathname}#/referral`;

  const stats = useMemo(() => ({
    total: referrals.length,
    pending: referrals.filter((referral) => referral.status === "pending").length,
    approved: referrals.filter((referral) => referral.status === "approved").length,
    rejected: referrals.filter((referral) => referral.status === "rejected").length,
  }), [referrals]);

  const filteredReferrals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return referrals
      .filter((referral) => statusFilter === "all" || referral.status === statusFilter)
      .filter((referral) => {
        if (!query) return true;
        const referrer = referral.referrerId ? studentsById.get(referral.referrerId) : undefined;
        return [
          referral.referredName,
          referral.relationship,
          referral.contactNumber || "",
          referral.notes || "",
          referral.status,
          referrer?.name || "",
          referrer?.studentNumber || "",
          referrer?.referralCode || "",
        ].some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [referrals, search, statusFilter, studentsById]);

  const resetForm = () => {
    setSelectedReferrerId("");
    setCandidateName("");
    setRelationship("");
    setContactNumber("");
    setNotes("");
  };

  const submitInternalReferral = async () => {
    if (!candidateName.trim() || !relationship.trim()) {
      toast({
        title: "Missing referral details",
        description: "Add the candidate name and relationship before saving.",
        variant: "destructive",
      });
      return;
    }

    await createReferral({
      referrerId: selectedReferrerId ? Number(selectedReferrerId) : undefined,
      referredName: candidateName.trim(),
      relationship: relationship.trim(),
      contactNumber: contactNumber.trim() || null,
      notes: notes.trim() || null,
      status: "pending",
    });
    resetForm();
  };

  const copyPublicLink = async () => {
    await navigator.clipboard.writeText(publicReferralUrl);
    toast({ title: "Referral link copied", description: "Students can register and submit referrals from this public portal." });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">Admissions Support</Badge>
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">Public portal: /referral</Badge>
          </div>
          <h2 className="mt-2 text-xl font-black">Referral Program System</h2>
          <p className="text-sm text-muted-foreground">
            Register student referrers, collect candidate leads, review submissions, and approve only qualified referrals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10 gap-2 bg-white" onClick={copyPublicLink}>
            <Copy className="h-4 w-4" />
            Copy Portal Link
          </Button>
          <Button className="h-10 gap-2" onClick={() => window.open(publicReferralUrl, "_blank")}>
            <ExternalLink className="h-4 w-4" />
            Open Student Portal
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <ReferralMetric icon={<UserPlus className="h-4 w-4" />} label="Total Referrals" value={stats.total} />
        <ReferralMetric icon={<Clock3 className="h-4 w-4" />} label="Pending Review" value={stats.pending} tone="amber" />
        <ReferralMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={stats.approved} tone="emerald" />
        <ReferralMetric icon={<XCircle className="h-4 w-4" />} label="Rejected" value={stats.rejected} tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <Card className="rounded-lg border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary" />
              Add Referral Lead
            </CardTitle>
            <CardDescription>
              Use this when admissions receives a referral by walk-in, message, or staff entry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedReferrerId || "none"} onValueChange={(value) => setSelectedReferrerId(value === "none" ? "" : value)}>
              <SelectTrigger className="h-10 bg-slate-50">
                <SelectValue placeholder="Optional referrer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked referrer</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={String(student.id)}>
                    {student.name} - {student.referralCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              name="candidateFullName"
              aria-label="Candidate full name"
              className="h-10 bg-slate-50"
              placeholder="Candidate full name"
              value={candidateName}
              onChange={(event) => setCandidateName(event.target.value)}
            />
            <Input
              name="candidateRelationship"
              aria-label="Relationship to referrer"
              className="h-10 bg-slate-50"
              placeholder="Relationship to referrer"
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
            />
            <Input
              name="candidateContactNumber"
              aria-label="Contact number"
              className="h-10 bg-slate-50"
              placeholder="Contact number"
              value={contactNumber}
              onChange={(event) => setContactNumber(event.target.value)}
            />
            <Textarea
              name="admissionsNotes"
              aria-label="Notes for admissions follow-up"
              className="min-h-24 bg-slate-50"
              placeholder="Notes for admissions follow-up"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <Button className="h-10 w-full gap-2" onClick={() => void submitInternalReferral()}>
              <UserPlus className="h-4 w-4" />
              Save as Pending
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-lg border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-white pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Referral Review Queue</CardTitle>
                <CardDescription>Pending leads should be contacted, verified, then approved or rejected.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    name="referralSearch"
                    aria-label="Search referrals"
                    className="h-10 w-full bg-slate-50 pl-9 sm:w-72"
                    placeholder="Search referrals..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 bg-slate-50 sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <div className="max-h-[620px] overflow-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReferrals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No referral records found.
                    </TableCell>
                  </TableRow>
                ) : filteredReferrals.map((referral) => {
                  const referrer = referral.referrerId ? studentsById.get(referral.referrerId) : undefined;
                  return (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <p className="font-semibold">{referral.referredName}</p>
                        <p className="text-xs text-muted-foreground">{referral.relationship}</p>
                        {referral.notes ? <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">{referral.notes}</p> : null}
                      </TableCell>
                      <TableCell>
                        {referrer ? (
                          <div>
                            <p className="font-medium">{referrer.name}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <KeyRound className="h-3 w-3" />
                              {referrer.referralCode}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unlinked lead</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{referral.contactNumber || "No contact"}</span>
                      </TableCell>

                      <TableCell>
                        <ReferralStatusBadge status={referral.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-700"
                            disabled={referral.status === "approved"}
                            onClick={() => updateReferral(referral.id, { status: "approved" })}
                            title="Approve referral"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-700"
                            disabled={referral.status === "rejected"}
                            onClick={() => updateReferral(referral.id, { status: "rejected" })}
                            title="Reject referral"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600"
                            disabled={referral.status === "pending"}
                            onClick={() => updateReferral(referral.id, { status: "pending" })}
                            title="Return to pending"
                          >
                            <Clock3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600"
                            onClick={() => {
                              if (confirm(`Delete referral for ${referral.referredName}?`)) {
                                void deleteReferral(referral.id);
                              }
                            }}
                            title="Delete referral"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ReferralMetric({
  icon,
  label,
  value,
  tone = "primary",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: "primary" | "amber" | "emerald" | "rose";
}) {
  const toneClass = {
    primary: "border-primary/15 bg-primary/5 text-primary",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  }[tone];

  return (
    <Card className={cn("rounded-lg shadow-sm", toneClass)}>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value.toLocaleString()}</p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/70">{icon}</div>
      </CardContent>
    </Card>
  );
}

function ReferralStatusBadge({ status }: { status: string }) {
  const tone = status === "approved"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "rejected"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  const label = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";

  return <Badge variant="outline" className={tone}>{label}</Badge>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/50 bg-white/40 px-3.5 py-3 shadow-sm backdrop-blur-md">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-700/85">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value.toLocaleString()}</p>
    </div>
  );
}

function AnalyticsInsightPanel({ analytics }: { analytics: ProgramAnalytics }) {
  return (
    <div className="rounded-xl border border-white/50 bg-white/40 px-3 py-2.5 shadow-sm backdrop-blur-md">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Analytics</p>
      <div className="mt-2 space-y-1.5 text-xs">
        <div className="flex items-start justify-between gap-2">
          <span className="shrink-0 text-slate-500">Top Feeder</span>
          <strong className="min-w-0 truncate text-right text-slate-900">{analytics.topFeederSchoolRegistry?.schoolName || "None"}</strong>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="shrink-0 text-slate-500">Top Municipality</span>
          <strong className="min-w-0 truncate text-right text-slate-900">{analytics.topMunicipality?.name || "None"}</strong>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-lg border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function SettingSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm font-semibold">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function statusTone(school: SchoolRegistry) {
  const status = getSchoolStatus(school);
  if (status === "Verified") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Auto-Located") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "Duplicate Entry") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "Missing Coordinates") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function findDuplicateSchoolIds(schools: SchoolRegistry[]) {
  const byName = new Map<string, SchoolRegistry[]>();
  schools.forEach((school) => {
    const key = normalizeSchoolName(school.normalizedSchoolName || school.schoolName);
    byName.set(key, [...(byName.get(key) || []), school]);
  });

  const duplicates = new Set<number>();
  byName.forEach((group) => {
    group
      .sort((a, b) => {
        if (hasCoordinates(a) && !hasCoordinates(b)) return -1;
        if (!hasCoordinates(a) && hasCoordinates(b)) return 1;
        return 0;
      })
      .slice(1)
      .forEach((school) => duplicates.add(school.id));
  });
  return duplicates;
}

function sortProgramSchools(schools: any[], sort: string) {
  return schools.slice().sort((a, b) => {
    if (sort === "total-desc") return b.totalStudentCount - a.totalStudentCount;
    if (sort === "name-asc") return a.name.localeCompare(b.name);
    if (sort === "municipality-asc") return (a.municipality || "").localeCompare(b.municipality || "") || a.name.localeCompare(b.name);
    if (sort === "college-asc") {
      return (a.dominantDepartment?.departmentName || a.dominantProgram?.collegeName || "Unknown").localeCompare(b.dominantDepartment?.departmentName || b.dominantProgram?.collegeName || "Unknown") || a.name.localeCompare(b.name);
    }
    return b.filteredStudentCount - a.filteredStudentCount;
  });
}

function usePersistentState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;

    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return defaultValue;
      const parsed = JSON.parse(stored) as T;
      if (
        defaultValue &&
        parsed &&
        typeof defaultValue === "object" &&
        typeof parsed === "object" &&
        !Array.isArray(defaultValue) &&
        !Array.isArray(parsed)
      ) {
        return { ...defaultValue, ...parsed } as T;
      }
      return parsed;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
