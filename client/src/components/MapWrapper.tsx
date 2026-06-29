import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Edit2,
  Eye,
  EyeOff,
  Layers,
  Map as MapIcon,
  MapPin,
  MonitorPlay,
  Pen,
} from "lucide-react";
import { useSchools } from "@/hooks/use-schools";
import { useMapInteractionProfile } from "@/hooks/useMapInteractionProfile";
import { useDrawing } from "@/hooks/useDrawing";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { DrawingToolbar } from "./DrawingToolbar";
import { DrawingCanvas } from "./DrawingCanvas";
import { DrawingLabelLayer } from "./DrawingLabelLayer";
import type { School } from "@shared/schema";
import { hasCoordinates } from "@shared/schoolRegistry";
import {
  ALL_PROGRAM_FILTER,
  distributionMatchesFilters,
  programFilterIsActive,
  type ProgramAnalytics,
  type ProgramFilters,
  type ProgramSchool,
} from "@shared/programIntelligence";
import { cn } from "@/lib/utils";
import { debounce } from "@/lib/performanceUtils";
import { resolveAnnotationInteractionPhase } from "@/lib/annotationInteraction";
import { readPointerDrawEnvironment } from "@/lib/pointerEnvironment";

const LAGUNA_CENTER: L.LatLngExpression = [14.1667, 121.25];
const LAGUNA_BOUNDS: L.LatLngBoundsExpression = [
  [13.78, 120.88],
  [14.58, 121.72],
];

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const MINIMAL_TILE_URL = "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const DARK_MINIMAL_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export interface MapDisplaySettings {
  minimalistMode: boolean;
  mapTheme: "light" | "dark";
  basemapPlaceNames: boolean;
  barangayLabels: boolean;
  cityLabels: boolean;
  schoolLabels: boolean;
  schoolNameLabels: boolean;
  roads: boolean;
  clusters: boolean;
  overlays: boolean;
  programLegend: boolean;
  /** Legacy persisted key — migrated into barangay/city toggles when present. */
  municipalityLabels?: boolean;
}

export const DEFAULT_MAP_DISPLAY_SETTINGS: MapDisplaySettings = {
  minimalistMode: false,
  mapTheme: "light",
  basemapPlaceNames: true,
  barangayLabels: false,
  cityLabels: false,
  schoolLabels: true,
  schoolNameLabels: false,
  roads: true,
  clusters: true,
  overlays: true,
  programLegend: true,
};

function normalizeMapDisplaySettings(raw: MapDisplaySettings): MapDisplaySettings {
  const legacyMuni = raw.municipalityLabels === true;
  return {
    ...DEFAULT_MAP_DISPLAY_SETTINGS,
    ...raw,
    barangayLabels: raw.barangayLabels ?? legacyMuni,
    cityLabels: raw.cityLabels ?? legacyMuni,
    basemapPlaceNames: raw.basemapPlaceNames ?? DEFAULT_MAP_DISPLAY_SETTINGS.basemapPlaceNames,
    mapTheme: raw.mapTheme ?? DEFAULT_MAP_DISPLAY_SETTINGS.mapTheme,
    programLegend: raw.programLegend ?? DEFAULT_MAP_DISPLAY_SETTINGS.programLegend,
  };
}

function resolveBasemapTileUrl(settings: MapDisplaySettings): string {
  const isDark = settings.mapTheme === "dark";
  const lightNoLabels = MINIMAL_TILE_URL;
  const lightLabels = TILE_URL;
  const darkNoLabels = DARK_MINIMAL_TILE_URL;
  const darkLabels = DARK_TILE_URL;

  if (settings.minimalistMode) {
    return isDark ? darkNoLabels : lightNoLabels;
  }
  if (!settings.roads) {
    return isDark ? darkNoLabels : lightNoLabels;
  }
  if (!settings.basemapPlaceNames) {
    return isDark ? darkNoLabels : lightNoLabels;
  }
  return isDark ? darkLabels : lightLabels;
}

export interface AnalyticsVisibility {
  densityLegend: boolean;
  schoolStats: boolean;
  municipalitySummary: boolean;
  enrollmentOverlay: boolean;
  heatmap: boolean;
  charts: boolean;
  summaryBadge: boolean;
  summaryFeederCount: boolean;
  summaryEnrollmentTotal: boolean;
  floatingPanels: boolean;
}

export interface DrawDisplaySettings {
  showDrawings: boolean;
  lockDrawingMode: boolean;
  annotationVisibility: boolean;
}

interface MapWrapperProps {
  onEditSchool: (school: School) => void;
  onMarkerClick?: (cluster: SchoolCluster) => void;
  isPresenting?: boolean;
  isTouring?: boolean;
  layoutKey?: string;
  analyticsVisibility: AnalyticsVisibility;
  mapSettings: MapDisplaySettings;
  drawSettings: DrawDisplaySettings;
  clearDrawSignal?: number;
  onAnalyticsVisibilityChange?: (key: keyof AnalyticsVisibility, checked: boolean) => void;
  onMapSettingChange?: <K extends keyof MapDisplaySettings>(key: K, value: MapDisplaySettings[K]) => void;
  onDrawSettingChange?: (key: keyof DrawDisplaySettings, checked: boolean) => void;
  onPresentationChange?: (presenting: boolean) => void;
  onTouringChange?: (touring: boolean) => void;
  onOpenSettings?: () => void;
  schools?: ProgramSchool[];
  programFilters?: ProgramFilters;
  programAnalytics?: ProgramAnalytics;
  legendOffsetPx?: number;
}

export type MappedSchool = ProgramSchool & { lat: number; lng: number };

export interface SchoolCluster {
  id: string;
  lat: number;
  lng: number;
  schools: MappedSchool[];
  totalStudents: number;
}

function getMarkerColor(count: number) {
  if (count >= 250) return "#e11d48";
  if (count >= 100) return "#2563eb";
  if (count >= 40) return "#0f766e";
  return "#64748b";
}

function getSchoolProgramColor(school: ProgramSchool, filters: ProgramFilters) {
  if (programFilterIsActive(filters)) {
    const filteredProgram = school.programDistribution.find((entry) => distributionMatchesFilters(entry, filters));
    if (filteredProgram) return filteredProgram.color;
  }
  return school.dominantProgram?.color || getMarkerColor(school.filteredStudentCount || school.studentCount);
}

function getClusterProgramColors(cluster: SchoolCluster, filters: ProgramFilters) {
  const programCounts = new Map<string, { color: string; count: number }>();
  for (const school of cluster.schools) {
    const program = programFilterIsActive(filters)
      ? school.programDistribution.find((entry) => distributionMatchesFilters(entry, filters))
      : school.dominantProgram;
    if (!program) continue;
    const current = programCounts.get(program.code) || { color: program.color, count: 0 };
    programCounts.set(program.code, { color: program.color, count: current.count + school.filteredStudentCount });
  }
  const sorted = Array.from(programCounts.values()).sort((a, b) => b.count - a.count);
  return {
    primary: sorted[0]?.color || getMarkerColor(cluster.totalStudents),
    secondary: sorted[1]?.color || sorted[0]?.color || getMarkerColor(cluster.totalStudents),
  };
}

function createSchoolIcon(
  cluster: SchoolCluster,
  index: number,
  options: { showLabel: boolean; showNameLabel: boolean; zoom: number; isPresenting: boolean; programFilters: ProgramFilters },
) {
  const { showLabel, showNameLabel, zoom, isPresenting, programFilters } = options;
  const isCluster = cluster.schools.length > 1;
  const clusterColors = isCluster ? getClusterProgramColors(cluster, programFilters) : null;
  const color = clusterColors?.primary || getSchoolProgramColor(cluster.schools[0], programFilters);
  const secondaryColor = clusterColors?.secondary || color;
  const countLabel = isCluster ? `${cluster.schools.length}` : `${cluster.totalStudents}`;
  const primaryTitle = isCluster
    ? `${cluster.schools.length} feeder schools`
    : cluster.schools[0].name;
  const subtitle = isCluster
    ? `${cluster.totalStudents.toLocaleString()} students in this area`
    : `${cluster.schools[0].municipality || "Laguna"} - ${cluster.schools[0].filteredStudentCount.toLocaleString()} students`;
  const meta = isCluster
    ? "Cluster"
    : cluster.schools[0].dominantProgram?.code || cluster.schools[0].institutionType || "Feeder Institution";

  return L.divIcon({
    html: `
      <div class="gis-marker ${isCluster ? "gis-marker-cluster" : ""} ${showLabel ? "gis-marker-show-label" : ""}" style="--marker-color:${color}; --marker-secondary-color:${secondaryColor}; animation-delay:${Math.min(index * 35, 420)}ms">
        <div class="gis-marker-core">
          <span class="gis-marker-pin" aria-hidden="true">
            <span class="gis-marker-stem"></span>
            <span class="gis-marker-ball"></span>
          </span>
          <span class="gis-marker-count">${countLabel}</span>
        </div>
        ${showNameLabel && !isCluster ? `<div class="gis-marker-name-label" aria-hidden="false">${escapeHtml(primaryTitle)}</div>` : ""}
        <div class="gis-marker-label" role="tooltip" aria-hidden="${showLabel ? "false" : "true"}">
          <span class="gis-marker-label-title">${escapeHtml(primaryTitle)}</span>
          <span class="gis-marker-label-subtitle">${escapeHtml(subtitle)}</span>
          <span class="gis-marker-label-meta">${escapeHtml(meta)}</span>
        </div>
      </div>
    `,
    className: "custom-leaflet-icon",
    iconSize: [22, 32],
    iconAnchor: [11, 31],
    popupAnchor: [0, -22],
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mappedSchools(schools: ProgramSchool[] = []): MappedSchool[] {
  return schools.filter(
    (school): school is MappedSchool =>
      hasCoordinates(school) && (school.filteredStudentCount ?? school.studentCount ?? 0) > 0,
  );
}

function coerceProgramSchools(schools: School[] = []): ProgramSchool[] {
  return schools.map((school) => ({
    ...school,
    totalStudentCount: school.studentCount,
    filteredStudentCount: school.studentCount,
    programDistribution: [],
  }));
}

function clusterSchools(schools: MappedSchool[], zoom: number, enabled: boolean): SchoolCluster[] {
  const gridSize = enabled ? getGridSize(zoom) : 0;
  if (gridSize === 0) {
    return schools.map((school) => ({
      id: `school-${school.id}`,
      lat: school.lat,
      lng: school.lng,
      schools: [school],
      totalStudents: school.filteredStudentCount,
    }));
  }

  const groups = new Map<string, MappedSchool[]>();
  for (const school of schools) {
    const key = `${Math.round(school.lat / gridSize)}:${Math.round(school.lng / gridSize)}`;
    const group = groups.get(key);
    if (group) group.push(school);
    else groups.set(key, [school]);
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const totalStudents = group.reduce((sum, school) => sum + school.filteredStudentCount, 0);
    return {
      id: `cluster-${key}`,
      lat: group.reduce((sum, school) => sum + school.lat, 0) / group.length,
      lng: group.reduce((sum, school) => sum + school.lng, 0) / group.length,
      schools: group,
      totalStudents,
    };
  });
}

function getGridSize(zoom: number) {
  if (zoom >= 14) return 0;
  if (zoom >= 13) return 0.008;
  if (zoom >= 12) return 0.016;
  if (zoom >= 11) return 0.03;
  return 0.055;
}

function MapSizeController({
  schools,
}: {
  schools: MappedSchool[];
}) {
  const map = useMap();
  const lastFitSignature = useRef("");

  useEffect(() => {
    const invalidate = debounce(() => {
      map.invalidateSize({ animate: false, pan: false });
    }, 50);
    const resizeObserver = new ResizeObserver(invalidate);
    const container = map.getContainer();
    resizeObserver.observe(container);

    // Also observe parent elements for layout changes
    const parent = container.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    window.addEventListener("resize", invalidate);
    document.addEventListener("fullscreenchange", invalidate);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", invalidate);
      document.removeEventListener("fullscreenchange", invalidate);
    };
  }, [map]);

  useEffect(() => {
    const signature = schools
      .map((school) => `${school.id}:${school.lat.toFixed(4)}:${school.lng.toFixed(4)}`)
      .sort()
      .join("|");

    if (signature === lastFitSignature.current) return;
    lastFitSignature.current = signature;

    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: false, pan: false });

      if (schools.length > 0) {
        const bounds = L.latLngBounds(schools.map((school) => [school.lat, school.lng] as L.LatLngTuple)).pad(0.18);
        map.fitBounds(bounds, {
          animate: true,
          duration: 0.65,
          paddingTopLeft: [90, 90],
          paddingBottomRight: [90, 90],
          maxZoom: 13,
        });
      } else {
        map.fitBounds(LAGUNA_BOUNDS, { animate: false, padding: [42, 42] });
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [schools, map]);

  return null;
}

function ZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => onZoomChange(map.getZoom()), [map, onZoomChange]);
  return null;
}

function MapInstanceBridge({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

function TourHandler({ isTouring, schools }: { isTouring: boolean; schools: MappedSchool[] }) {
  const map = useMap();

  useEffect(() => {
    if (!isTouring || schools.length === 0) return;

    const topSchools = [...schools].sort((a, b) => b.filteredStudentCount - a.filteredStudentCount).slice(0, 5);
    let index = 0;

    const tourInterval = window.setInterval(() => {
      const school = topSchools[index];
      map.flyTo([school.lat, school.lng], 14, { duration: 1.7 });
      index = (index + 1) % topSchools.length;
    }, 5200);

    return () => window.clearInterval(tourInterval);
  }, [isTouring, schools, map]);

  return null;
}

function MapGestureGuard({ active }: { active: boolean }) {
  const map = useMap();
  const androidDrawing = useMemo(() => readPointerDrawEnvironment().androidDrawingOptimizations, []);

  useEffect(() => {
    if (!androidDrawing) return;

    const action = active ? "disable" : "enable";
    map.dragging[action]();
    map.touchZoom[action]();
    map.scrollWheelZoom[action]();
    map.doubleClickZoom[action]();
    map.boxZoom[action]();
    map.keyboard[action]();
    const tap = (map as L.Map & { tap?: { disable: () => void; enable: () => void } }).tap;
    tap?.[action]?.();

    return () => {
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      tap?.enable?.();
    };
  }, [active, androidDrawing, map]);

  return null;
}

const SchoolMarker = memo(function SchoolMarker({
  cluster,
  index,
  onEditSchool,
  onMarkerClick,
  isPresenting,
  showLabel,
  showNameLabel,
  zoom,
  programFilters,
}: {
  cluster: SchoolCluster;
  index: number;
  onEditSchool: (school: School) => void;
  onMarkerClick?: (cluster: SchoolCluster) => void;
  isPresenting: boolean;
  showLabel: boolean;
  showNameLabel: boolean;
  zoom: number;
  programFilters: ProgramFilters;
}) {
  const icon = useMemo(
    () => createSchoolIcon(cluster, index, { showLabel, showNameLabel, zoom, isPresenting, programFilters }),
    [cluster, index, isPresenting, programFilters, showLabel, showNameLabel, zoom],
  );

  return (
    <Marker
      position={[cluster.lat, cluster.lng]}
      icon={icon}
      riseOnHover
      eventHandlers={{
        click: () => onMarkerClick?.(cluster),
      }}
    />
  );
});

function AnalyticsOverlays({
  schools,
  visibility,
  overlaysEnabled,
}: {
  schools: MappedSchool[];
  visibility: AnalyticsVisibility;
  overlaysEnabled: boolean;
}) {
  void schools;
  void visibility;
  void overlaysEnabled;
  return null;
}

function getMunicipalityStats(schools: MappedSchool[]) {
  const groups = new Map<string, { schools: number; students: number }>();

  for (const school of schools) {
    const name = school.municipality || "Unspecified";
    const current = groups.get(name) || { schools: 0, students: 0 };
    groups.set(name, {
      schools: current.schools + 1,
      students: current.students + school.filteredStudentCount,
    });
  }

  return Array.from(groups.entries())
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.students - a.students);
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/50 bg-white/70 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-lg font-black">{value}</p>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

function ProgramMapLegend({
  analytics,
  filters,
  leftOffset,
}: {
  analytics?: ProgramAnalytics;
  filters: ProgramFilters;
  leftOffset: number;
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });
  const activeLabel = [
    filters.college !== ALL_PROGRAM_FILTER ? filters.college : "",
    filters.program !== ALL_PROGRAM_FILTER ? filters.program : "",
    filters.track !== ALL_PROGRAM_FILTER ? filters.track : "",
  ].filter(Boolean).join(" / ") || "All Programs";
  const legendItems = analytics?.departmentDistribution.length
    ? analytics.departmentDistribution
    : [];

  return (
    <div className={cn("program-map-legend", open && "is-open")} style={{ "--program-legend-left": `${leftOffset}px` } as CSSProperties}>
      <button
        type="button"
        className="program-map-legend-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>Program Legend</span>
        <span className="program-map-legend-count">{analytics?.totalStudents.toLocaleString() || 0}</span>
      </button>
      {open && (
        <div className="program-map-legend-body">
          <p className="program-map-legend-active">{activeLabel}</p>
          {legendItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-y-1.5 text-[11px]">
              {legendItems.map((item) => (
                <div key={item.department} className="flex min-w-0 items-center justify-between gap-2">
                  <LegendItem color={item.color} label={item.departmentName || item.department} />
                  <span className="shrink-0 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-black text-white">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-500">No active program matches.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MunicipalityLabels({ schools }: { schools: MappedSchool[] }) {
  const labels = useMemo(() => {
    const groups = getMunicipalityStats(schools);
    return groups.map((group) => {
      const members = schools.filter((school) => (school.municipality || "Unspecified") === group.name);
      return {
        name: group.name,
        students: group.students,
        lat: members.reduce((sum, school) => sum + school.lat, 0) / members.length,
        lng: members.reduce((sum, school) => sum + school.lng, 0) / members.length,
      };
    });
  }, [schools]);

  return (
    <>
      {labels.map((label) => (
        <Marker
          key={`municipality-${label.name}`}
          position={[label.lat, label.lng]}
          interactive={false}
          icon={L.divIcon({
            className: "custom-leaflet-icon",
            html: `<div class="gis-municipality-label"><strong>${escapeHtml(label.name)}</strong><span>${label.students.toLocaleString()} students</span></div>`,
            iconSize: [150, 34],
            iconAnchor: [75, 17],
          })}
        />
      ))}
    </>
  );
}

function MapAnnotationClickBridge({
  active,
  onClearSelection,
}: {
  active: boolean;
  onClearSelection: () => void;
}) {
  useMapEvents({
    click: () => {
      if (!active) return;
      (document.activeElement as HTMLElement | null)?.blur?.();
      onClearSelection();
    },
  });
  return null;
}

export default function MapWrapper({
  onEditSchool,
  onMarkerClick,
  isPresenting = false,
  isTouring = false,
  layoutKey = "default",
  analyticsVisibility,
  mapSettings,
  drawSettings,
  clearDrawSignal = 0,
  onAnalyticsVisibilityChange,
  onMapSettingChange,
  onDrawSettingChange,
  onPresentationChange,
  onTouringChange,
  onOpenSettings,
  schools: providedSchools,
  programFilters = {
    college: ALL_PROGRAM_FILTER,
    program: ALL_PROGRAM_FILTER,
    track: ALL_PROGRAM_FILTER,
  },
  programAnalytics,
  legendOffsetPx = 16,
}: MapWrapperProps) {
  const schoolsQuery = useSchools();
  const schools = providedSchools || coerceProgramSchools(schoolsQuery.data || []);
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(11);
  const [isDrawingEnabled, setIsDrawingEnabled] = usePersistentState("trimex-gis-map:draw-toolbar-open-v2", false);
  const drawButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawing = useDrawing();
  const lastExternalClearSignal = useRef(clearDrawSignal);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [drawButtonSize, setDrawButtonSize] = useState(44);
  const [isActiveCanvasStroke, setIsActiveCanvasStroke] = useState(false);

  const interactionProfile = useMapInteractionProfile();
  const uiMapSettings = useMemo(() => normalizeMapDisplaySettings(mapSettings), [mapSettings]);
  const tileUrl = useMemo(() => resolveBasemapTileUrl(uiMapSettings), [uiMapSettings]);

  const plottedSchools = useMemo(() => mappedSchools(schools || []), [schools]);
  const clusters = useMemo(() => clusterSchools(plottedSchools, zoom, uiMapSettings.clusters), [plottedSchools, zoom, uiMapSettings.clusters]);
  const showMunicipalityLayer = uiMapSettings.overlays && (uiMapSettings.barangayLabels || uiMapSettings.cityLabels);

  const annotationLayerActive = Boolean(leafletMap) && drawSettings.showDrawings;
  const drawInteractionActive = annotationLayerActive && isDrawingEnabled && drawing.mode !== null;
  const annotationInteractionEnabled = annotationLayerActive && isDrawingEnabled;

  const annotationPhase = useMemo(
    () =>
      resolveAnnotationInteractionPhase({
        mode: drawing.mode,
        selectedAnnotationId: drawing.selectedAnnotationId,
      }),
    [drawing.mode, drawing.selectedAnnotationId],
  );

  const labelObjects = useMemo(
    () => drawing.objects.filter((object) => object.type === "label"),
    [drawing.objects],
  );

  const setDrawingEnabled = useCallback((enabled: boolean) => {
    setIsDrawingEnabled(enabled);
    if (!enabled) {
      drawing.cancelCurrentStroke();
      drawing.setMode(null);
      drawing.setSelectedAnnotationId(null);
    }
  }, [drawing, setIsDrawingEnabled]);

  const handleDeleteSelected = useCallback(() => {
    if (!drawing.selectedAnnotationId) return;
    drawing.deleteObject(drawing.selectedAnnotationId);
  }, [drawing]);
  const handleZoomChange = useCallback((nextZoom: number) => {
    setZoom((currentZoom) => currentZoom === nextZoom ? currentZoom : nextZoom);
  }, []);
  const handleMapReady = useCallback((map: L.Map) => {
    setLeafletMap((currentMap) => currentMap === map ? currentMap : map);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!drawButtonRef.current) return;

    const updateButtonSize = () => {
      if (!drawButtonRef.current) return;
      setDrawButtonSize(Math.round(drawButtonRef.current.getBoundingClientRect().width) || 44);
    };

    updateButtonSize();
    const observer = new ResizeObserver(updateButtonSize);
    observer.observe(drawButtonRef.current);

    return () => observer.disconnect();
  }, []);

  const handleUndo = useCallback(() => {
    if (drawing.canUndo) {
      drawing.undo();
    }
  }, [drawing]);

  const handleRedo = useCallback(() => {
    if (drawing.canRedo) {
      drawing.redo();
    }
  }, [drawing]);

  const handleClear = useCallback(() => {
    drawing.clear();
  }, [drawing]);

  useEffect(() => {
    if (clearDrawSignal === lastExternalClearSignal.current) return;
    lastExternalClearSignal.current = clearDrawSignal;
    handleClear();
  }, [clearDrawSignal, handleClear]);

  useEffect(() => {
    const map = leafletMap;
    if (!map) return;
    const bump = () => {
      requestAnimationFrame(() => {
        map.invalidateSize({ animate: false, pan: false });
      });
    };
    document.addEventListener("fullscreenchange", bump);
    document.addEventListener("webkitfullscreenchange", bump as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", bump);
      document.removeEventListener("webkitfullscreenchange", bump as EventListener);
    };
  }, [leafletMap]);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100">
        <MapIcon className="h-10 w-10 text-slate-300" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[#eef2ef]",
        isDrawingEnabled && "drawing-mode",
        drawing.mode && "draw-tool-active",
        isActiveCanvasStroke && "draw-stroke-active",
        isPresenting && "presenting-map",
      )}
    >
      <MapContainer
        center={LAGUNA_CENTER}
        zoom={11}
        minZoom={9}
        maxZoom={18}
        maxBounds={LAGUNA_BOUNDS}
        maxBoundsViscosity={0.75}
        zoomControl={false}
        className="relative z-0 h-full w-full"
        preferCanvas
      >
        <TileLayer attribution={TILE_ATTRIBUTION} url={tileUrl} updateWhenIdle updateWhenZooming={false} keepBuffer={4} />
        <ZoomControl position="bottomright" />
        <MapInstanceBridge onReady={handleMapReady} />
        <MapSizeController schools={plottedSchools} />
        <ZoomWatcher onZoomChange={handleZoomChange} />
        <TourHandler isTouring={isTouring} schools={plottedSchools} />
        <MapGestureGuard active={drawInteractionActive && isActiveCanvasStroke} />
        <MapAnnotationClickBridge
          active={Boolean(drawing.selectedAnnotationId)}
          onClearSelection={() => drawing.setSelectedAnnotationId(null)}
        />

        <AnalyticsOverlays
          schools={plottedSchools}
          visibility={analyticsVisibility}
          overlaysEnabled={uiMapSettings.overlays}
        />
        {showMunicipalityLayer && <MunicipalityLabels schools={plottedSchools} />}

        {clusters.map((cluster, index) => (
          <SchoolMarker
            key={cluster.id}
            cluster={cluster}
            index={index}
            onEditSchool={onEditSchool}
            onMarkerClick={onMarkerClick}
            isPresenting={isPresenting}
            showLabel={uiMapSettings.schoolLabels && !isPresenting}
            showNameLabel={uiMapSettings.schoolNameLabels && !isPresenting}
            zoom={zoom}
            programFilters={programFilters}
          />
        ))}
      </MapContainer>

      <DrawingCanvas
        drawing={drawing}
        layerActive={annotationLayerActive}
        interactionEnabled={annotationInteractionEnabled}
        interactionPhase={annotationPhase}
        showStrokeAnnotations={drawSettings.annotationVisibility}
        interactionCoarse={interactionProfile.isCoarsePointer}
        map={leafletMap}
        onStrokeActivityChange={setIsActiveCanvasStroke}
      />

      <DrawingLabelLayer
        map={leafletMap}
        labels={labelObjects}
        visible={annotationLayerActive && drawSettings.annotationVisibility}
        selectedId={drawing.selectedAnnotationId}
        onSelect={drawing.setSelectedAnnotationId}
        onUpdateText={drawing.updateLabelText}
        onUpdateColor={drawing.updateLabelColor}
        onUpdateSize={drawing.updateLabelSize}
        onUpdateStyle={drawing.updateLabelStyle}
        onDelete={drawing.deleteObject}
        onMovePoint={drawing.moveLabelToLatLng}
        interactive={annotationInteractionEnabled}
      />

      {uiMapSettings.programLegend && (
        <ProgramMapLegend analytics={programAnalytics} filters={programFilters} leftOffset={legendOffsetPx} />
      )}

      <div className="absolute right-4 top-4 z-[1130] flex flex-col items-end gap-2" data-gis-draw-occlude="right">
        <div className="flex items-center gap-2">
          {onMapSettingChange && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="gis-control-button h-11 w-11 rounded-full"
                  title="Map layers"
                  aria-label="Map layers and theme"
                >
                  <Layers className="control-button-icon h-4 w-4" strokeWidth={1.5} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3" sideOffset={10}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Map appearance</p>
                <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-0.5">
                  <Button
                    type="button"
                    variant={uiMapSettings.mapTheme === "light" ? "secondary" : "ghost"}
                    className="h-8 flex-1 text-xs font-semibold"
                    onClick={() => onMapSettingChange("mapTheme", "light")}
                  >
                    Light
                  </Button>
                  <Button
                    type="button"
                    variant={uiMapSettings.mapTheme === "dark" ? "secondary" : "ghost"}
                    className="h-8 flex-1 text-xs font-semibold"
                    onClick={() => onMapSettingChange("mapTheme", "dark")}
                  >
                    Dark
                  </Button>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <Label className="text-xs font-medium text-slate-700">Minimal basemap</Label>
                    <Switch
                      checked={uiMapSettings.minimalistMode}
                      onCheckedChange={(v) => onMapSettingChange("minimalistMode", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <Label className="text-xs font-medium text-slate-700">Roads</Label>
                    <Switch checked={uiMapSettings.roads} onCheckedChange={(v) => onMapSettingChange("roads", v)} />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <Label className="text-xs font-medium text-slate-700">Place &amp; street names</Label>
                    <Switch
                      checked={uiMapSettings.basemapPlaceNames}
                      onCheckedChange={(v) => onMapSettingChange("basemapPlaceNames", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <Label className="text-xs font-medium text-slate-700">Barangay area labels</Label>
                    <Switch
                      checked={uiMapSettings.barangayLabels}
                      onCheckedChange={(v) => onMapSettingChange("barangayLabels", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <Label className="text-xs font-medium text-slate-700">City / municipality labels</Label>
                    <Switch
                      checked={uiMapSettings.cityLabels}
                      onCheckedChange={(v) => onMapSettingChange("cityLabels", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <Label className="text-xs font-medium text-slate-700">School info labels</Label>
                    <Switch
                      checked={uiMapSettings.schoolLabels}
                      onCheckedChange={(v) => onMapSettingChange("schoolLabels", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <Label className="text-xs font-medium text-slate-700">School name labels</Label>
                    <Switch
                      checked={uiMapSettings.schoolNameLabels}
                      onCheckedChange={(v) => onMapSettingChange("schoolNameLabels", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <Label className="text-xs font-medium text-slate-700">Marker clustering</Label>
                    <Switch checked={uiMapSettings.clusters} onCheckedChange={(v) => onMapSettingChange("clusters", v)} />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <Label className="text-xs font-medium text-slate-700">GIS overlays</Label>
                    <Switch checked={uiMapSettings.overlays} onCheckedChange={(v) => onMapSettingChange("overlays", v)} />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <Label className="text-xs font-medium text-slate-700">Program legend</Label>
                    <Switch checked={uiMapSettings.programLegend} onCheckedChange={(v) => onMapSettingChange("programLegend", v)} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {onPresentationChange && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn(
                "gis-control-button h-11 w-11 rounded-full",
                isPresenting && "is-active is-presentation-active",
              )}
              title={isPresenting ? "Exit presentation" : "Presentation mode"}
              aria-pressed={isPresenting}
              onClick={() => onPresentationChange(!isPresenting)}
            >
              <MonitorPlay className="control-button-icon h-4 w-4" strokeWidth={1.5} />
            </Button>
          )}

          {onDrawSettingChange && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn(
                "gis-control-button h-11 w-11 rounded-full",
                drawSettings.annotationVisibility && "annotation-visibility-on",
              )}
              title={drawSettings.annotationVisibility ? "Hide all annotations" : "Show annotations"}
              aria-pressed={drawSettings.annotationVisibility}
              onClick={() => onDrawSettingChange("annotationVisibility", !drawSettings.annotationVisibility)}
            >
              {drawSettings.annotationVisibility ? (
                <Eye className="annotation-visibility-icon h-4 w-4" strokeWidth={1.5} />
              ) : (
                <EyeOff className="annotation-visibility-icon h-4 w-4" strokeWidth={1.5} />
              )}
            </Button>
          )}

          <Button
            ref={drawButtonRef}
            variant="secondary"
            size="icon"
            className={cn(
              "gis-control-button h-11 w-11 rounded-full transition-transform hover:scale-105",
              isDrawingEnabled && "draw-dock-open",
            )}
            onClick={() => {
              if (drawSettings.lockDrawingMode && isDrawingEnabled) return;
              setDrawingEnabled(!isDrawingEnabled);
            }}
            aria-label="Toggle drawing tools"
            aria-pressed={isDrawingEnabled}
            title="Draw tools"
          >
            <Pen className="control-button-icon h-4 w-4" strokeWidth={1.5} />
          </Button>

        </div>

        <AnimatePresence>
          {isDrawingEnabled && (
            <motion.div
              className="pointer-events-auto flex justify-end"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <DrawingToolbar
                mode={drawing.mode}
                onModeChange={(next) => {
                  drawing.cancelCurrentStroke();
                  drawing.setMode(next);
                  drawing.setSelectedAnnotationId(null);
                }}
                color={drawing.color}
                onColorChange={drawing.setColor}
                width={drawing.width}
                onWidthChange={drawing.setWidth}
                canUndo={drawing.canUndo}
                canRedo={drawing.canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onClear={handleClear}
                onDeleteSelected={handleDeleteSelected}
                hasSelection={Boolean(drawing.selectedAnnotationId)}
                onDeselectTool={() => {
                  drawing.cancelCurrentStroke();
                  drawing.setMode(null);
                  drawing.setSelectedAnnotationId(null);
                }}
                isStylusMode={drawing.isStylusMode}
                onStylusModeChange={drawing.setIsStylusMode}
                stylusGuardHint={interactionProfile.isCoarsePointer ? "Tablet / touch" : "Precision pointer"}
                buttonSize={drawButtonSize}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
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
