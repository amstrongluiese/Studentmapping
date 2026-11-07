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

// Guarantee standard raster tile layers (Carto, ESRI, OSM) never request non-integer zoom levels (e.g. 11.25), preventing 404 errors
if (typeof window !== "undefined" && L && L.TileLayer && L.TileLayer.prototype) {
  const originalGetZoomForUrl = (L.TileLayer.prototype as any)._getZoomForUrl;
  if (originalGetZoomForUrl && !(L.TileLayer.prototype as any).__roundedZoomPatched) {
    (L.TileLayer.prototype as any)._getZoomForUrl = function () {
      const z = originalGetZoomForUrl.call(this);
      return typeof z === "number" ? Math.round(z) : z;
    };
    (L.TileLayer.prototype as any).__roundedZoomPatched = true;
  }
}
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Check,
  Compass,
  Edit2,
  Eye,
  EyeOff,
  Globe,
  Heart,
  Layers,
  Map as MapIcon,
  MapPin,
  MonitorPlay,
  Moon,
  Mountain,
  Navigation,
  Pen,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Zap,
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
import { SchoolRegistry as School } from "@shared/schema";
import { hasCoordinates } from "@shared/schoolRegistry";
import {
  ALL_PROGRAM_FILTER,
  distributionMatchesFilters,
  programFilterIsActive,
  type ProgramAnalytics,
  type ProgramFilters,
} from "@shared/programIntelligence";
type ProgramSchool = any;
import { cn } from "@/lib/utils";
import { debounce } from "@/lib/performanceUtils";
import { resolveAnnotationInteractionPhase } from "@/lib/annotationInteraction";
import { readPointerDrawEnvironment } from "@/lib/pointerEnvironment";

import {
  LAGUNA_CENTER,
  LAGUNA_BOUNDS,
  PHILIPPINES_BOUNDS,
  BASEMAP_OPTIONS,
  DEFAULT_MAP_DISPLAY_SETTINGS,
  normalizeMapDisplaySettings,
  resolveBasemapTileUrl,
  type BasemapStyle,
  type MapDisplaySettings,
  type AnalyticsVisibility,
  type DrawDisplaySettings,
} from "@/lib/mapSettings";

export type { MapDisplaySettings, AnalyticsVisibility, DrawDisplaySettings, BasemapStyle };


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
  isScholarsMode?: boolean;
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

function getSchoolProgramColor(school: any, filters: ProgramFilters, isScholarsMode?: boolean) {
  if (isScholarsMode) return "#4f46e5"; // Indigo for Scholar mode
  if (programFilterIsActive(filters)) {
    const filteredProgram = school.programDistribution.find((entry: any) => distributionMatchesFilters(entry, filters));
    if (filteredProgram) return filteredProgram.color;
  }
  return school.dominantProgram?.color || getMarkerColor((school as any).filteredStudentCount || (school as any).studentCount);
}

function getClusterProgramColors(cluster: SchoolCluster, filters: ProgramFilters, isScholarsMode?: boolean) {
  if (isScholarsMode) return { primary: "#4f46e5", secondary: "#4338ca" }; // Indigo cluster for scholars

  const programCounts = new Map<string, { color: string; count: number }>();
  for (const school of cluster.schools) {
    const program = programFilterIsActive(filters)
      ? (school as any).programDistribution.find((entry: any) => distributionMatchesFilters(entry, filters))
      : (school as any).dominantProgram;
    if (!program) continue;
    const current = programCounts.get(program.code) || { color: program.color, count: 0 };
    programCounts.set(program.code, { color: program.color, count: current.count + (school as any).filteredStudentCount });
  }
  const sorted = Array.from(programCounts.values()).sort((a, b) => b.count - a.count);
  return {
    primary: sorted[0]?.color || getMarkerColor(cluster.totalStudents),
    secondary: sorted[1]?.color || sorted[0]?.color || getMarkerColor(cluster.totalStudents),
  };
}

function getStableIndex(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 20;
}

function createSchoolIcon(
  cluster: SchoolCluster,
  options: { showLabel: boolean; showNameLabel: boolean; zoom: number; isPresenting: boolean; programFilters: ProgramFilters; isScholarsMode?: boolean },
) {
  const { showLabel, showNameLabel, zoom, isPresenting, programFilters, isScholarsMode } = options;
  const isCluster = cluster.schools.length > 1;
  const clusterColors = isCluster ? getClusterProgramColors(cluster, programFilters, isScholarsMode) : null;
  const color = clusterColors?.primary || getSchoolProgramColor(cluster.schools[0], programFilters, isScholarsMode);
  const secondaryColor = clusterColors?.secondary || color;
  const countLabel = isCluster ? `${cluster.schools.length}` : `${cluster.totalStudents}`;
  const primaryTitle = isCluster
    ? (isScholarsMode ? `${cluster.schools.length} Barangays` : `${cluster.schools.length} feeder schools`)
    : cluster.schools[0].schoolName;
  const subtitle = isCluster
    ? `${cluster.totalStudents.toLocaleString()} students in this area`
    : `${cluster.schools[0].municipality || "Laguna"} - ${cluster.schools[0].filteredStudentCount.toLocaleString()} students`;
  const meta = isCluster
    ? "Cluster"
    : (isScholarsMode ? "Barangay" : cluster.schools[0].dominantProgram?.code || cluster.schools[0].institutionType || "Feeder Institution");

  const shouldShowNameBadge = showNameLabel && !isCluster && (zoom >= 13 || (isPresenting && zoom >= 12));
  const stableIndex = getStableIndex(cluster.id);

  return L.divIcon({
    html: `
      <div class="gis-marker ${isCluster ? "gis-marker-cluster" : ""} ${showLabel ? "gis-marker-show-label" : ""}" style="--marker-color:${color}; --marker-secondary-color:${secondaryColor}; animation-delay:${Math.min(stableIndex * 35, 420)}ms">
        <div class="gis-marker-core">
          <div class="gis-pin-svg-wrap">
            <svg class="gis-pin-svg" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 36C14 36 27 22.8 27 13.5C27 6.04416 21.1797 0 14 0C6.8203 0 1 6.04416 1 13.5C1 22.8 14 36 14 36Z" fill="#ffffff" class="gis-pin-border"/>
              <path d="M14 33.5C14 33.5 25 21.2 25 13.5C25 7.42487 20.0751 2.5 14 2.5C7.92487 2.5 3 7.42487 3 13.5C3 21.2 14 33.5 14 33.5Z" fill="${color}" class="gis-pin-fill"/>
              <circle cx="14" cy="13.5" r="9.5" fill="rgba(255,255,255,0.2)" class="gis-pin-glow"/>
            </svg>
            <span class="gis-marker-count ${countLabel.length >= 3 ? "text-tight" : ""}">${countLabel}</span>
          </div>
        </div>
        ${shouldShowNameBadge ? `<div class="gis-marker-name-label" aria-hidden="false">${escapeHtml(primaryTitle)}</div>` : ""}
        <div class="gis-marker-label" role="tooltip" aria-hidden="${showLabel ? "false" : "true"}">
          <span class="gis-marker-label-title">${escapeHtml(primaryTitle)}</span>
          <span class="gis-marker-label-subtitle">${escapeHtml(subtitle)}</span>
          <span class="gis-marker-label-meta">${escapeHtml(meta)}</span>
        </div>
      </div>
    `,
    className: "custom-leaflet-icon",
    iconSize: [28, 36],
    iconAnchor: [14, 35],
    popupAnchor: [0, -32],
  });
}

function escapeHtml(value?: string | null) {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mappedSchools(schools: ProgramSchool[] = []): MappedSchool[] {
  return schools
    .filter((school) => {
      if (school.schoolName === "Unspecified") return false;
      if (!hasCoordinates(school)) return false;
      if (((school as any).filteredStudentCount ?? (school as any).studentCount ?? 0) <= 0) return false;
      const lat = school.latitude;
      const lng = school.longitude;
      // Coordinates must lie strictly inside Laguna's bounding box
      return lat >= 13.78 && lat <= 14.58 && lng >= 120.88 && lng <= 121.72;
    })
    .map((school) => ({
      ...school,
      lat: school.latitude,
      lng: school.longitude,
    })) as MappedSchool[];
}

function coerceProgramSchools(schools: School[] = []): ProgramSchool[] {
  return schools.map((school) => ({
    ...school,
    totalStudentCount: (school as any).studentCount,
    filteredStudentCount: (school as any).studentCount,
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
      totalStudents: (school as any).filteredStudentCount,
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
    const totalStudents = group.reduce((sum, school) => sum + (school as any).filteredStudentCount, 0);
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

function ViewportWatcher({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const debouncedBoundsChange = useMemo(
    () => debounce((bounds: L.LatLngBounds) => onBoundsChange(bounds), 50),
    [onBoundsChange]
  );

  const map = useMapEvents({
    moveend() {
      debouncedBoundsChange(map.getBounds());
    },
    zoomend() {
      debouncedBoundsChange(map.getBounds());
    },
  });

  useEffect(() => {
    debouncedBoundsChange(map.getBounds());
  }, [map, debouncedBoundsChange]);

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
  onEditSchool,
  onMarkerClick,
  isPresenting,
  showLabel,
  showNameLabel,
  zoom,
  programFilters,
  isScholarsMode,
}: {
  cluster: SchoolCluster;
  onEditSchool: (school: School) => void;
  onMarkerClick?: (cluster: SchoolCluster) => void;
  isPresenting: boolean;
  showLabel: boolean;
  showNameLabel: boolean;
  zoom: number;
  programFilters: ProgramFilters;
  isScholarsMode?: boolean;
}) {
  const icon = useMemo(
    () => createSchoolIcon(cluster, { showLabel, showNameLabel, zoom, isPresenting, programFilters, isScholarsMode }),
    [cluster, isPresenting, programFilters, showLabel, showNameLabel, zoom, isScholarsMode],
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
      students: current.students + (school as any).filteredStudentCount,
    });
  }

  return Array.from(groups.entries())
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.students - a.students);
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/70 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-lg font-black text-foreground">{value}</p>
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
  isScholarsMode,
}: {
  analytics?: ProgramAnalytics;
  filters: ProgramFilters;
  leftOffset: number;
  isScholarsMode?: boolean;
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });

  if (isScholarsMode) {
    return (
      <div className={cn("program-map-legend", open && "is-open")} style={{ "--program-legend-left": `${leftOffset}px` } as CSSProperties}>
        <button type="button" className="program-map-legend-toggle" onClick={() => setOpen((current) => !current)}>
          <span>Scholar Density</span>
          <span className="program-map-legend-count">{analytics?.totalStudents.toLocaleString() || 0}</span>
        </button>
        {open && (
          <div className="program-map-legend-body">
            <p className="program-map-legend-active">Scholars per Barangay</p>
            <div className="grid grid-cols-1 gap-y-1.5 text-[11px]">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <LegendItem color="#e11d48" label="High Density (250+)" />
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <LegendItem color="#2563eb" label="Medium-High (100-249)" />
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <LegendItem color="#0f766e" label="Medium (40-99)" />
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <LegendItem color="#64748b" label="Low (1-39)" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

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

function getBasemapIcon(id: BasemapStyle) {
  switch (id) {
    case "natgeo":
      return <Heart className="h-3.5 w-3.5 text-amber-600 fill-amber-500/20" />;
    case "street":
      return <Navigation className="h-3.5 w-3.5" />;
    case "minimal":
      return <Sparkles className="h-3.5 w-3.5" />;
    case "topo":
      return <Mountain className="h-3.5 w-3.5" />;
    case "satellite":
      return <Globe className="h-3.5 w-3.5" />;
    case "dark":
      return <Moon className="h-3.5 w-3.5" />;
    case "osm":
      return <Compass className="h-3.5 w-3.5" />;
    default:
      return <MapIcon className="h-3.5 w-3.5" />;
  }
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
  legendOffsetPx = 12,
  isScholarsMode,
}: MapWrapperProps) {
  const schoolsQuery = useSchools();
  const schools = providedSchools || coerceProgramSchools(schoolsQuery.data || []);
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(11);
  const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(null);
  const [isDrawingEnabled, setIsDrawingEnabled] = usePersistentState("trimex-gis-map:draw-toolbar-open-v2", false);
  const drawButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawing = useDrawing();
  const lastExternalClearSignal = useRef(clearDrawSignal);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [drawButtonSize, setDrawButtonSize] = useState(44);
  const [isActiveCanvasStroke, setIsActiveCanvasStroke] = useState(false);

  const interactionProfile = useMapInteractionProfile();
  const uiMapSettings = useMemo(() => normalizeMapDisplaySettings(mapSettings), [mapSettings]);
  const tileConfig = useMemo(() => resolveBasemapTileUrl(uiMapSettings), [uiMapSettings]);

  const plottedSchools = useMemo(() => mappedSchools(schools || []), [schools]);
  const clusters = useMemo(() => clusterSchools(plottedSchools, zoom, uiMapSettings.clusters), [plottedSchools, zoom, uiMapSettings.clusters]);

  const currentBasemap: BasemapStyle =
    uiMapSettings.mapTheme === "dark"
      ? "dark"
      : uiMapSettings.basemapStyle || (uiMapSettings.minimalistMode ? "minimal" : "street");

  const handleSelectBasemap = useCallback((styleId: BasemapStyle) => {
    if (!onMapSettingChange) return;
    onMapSettingChange("basemapStyle", styleId);
    if (styleId === "dark") {
      onMapSettingChange("mapTheme", "dark");
    } else {
      onMapSettingChange("mapTheme", "light");
      if (styleId === "minimal") {
        onMapSettingChange("minimalistMode", true);
      } else {
        onMapSettingChange("minimalistMode", false);
      }
    }
  }, [onMapSettingChange]);

  const handleResetMapSettings = useCallback(() => {
    if (!onMapSettingChange) return;
    (Object.keys(DEFAULT_MAP_DISPLAY_SETTINGS) as Array<keyof MapDisplaySettings>).forEach((key) => {
      onMapSettingChange(key, DEFAULT_MAP_DISPLAY_SETTINGS[key]);
    });
  }, [onMapSettingChange]);
  
  // Performance optimization: only render clusters/markers visible in the current viewport bounds
  const visibleClusters = useMemo(() => {
    if (!currentBounds) return clusters;
    const paddedBounds = currentBounds.pad(0.15); // pad by 15% so pins don't pop out abruptly at screen edges
    return clusters.filter((cluster) => paddedBounds.contains([cluster.lat, cluster.lng]));
  }, [clusters, currentBounds]);

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
        "relative h-full w-full overflow-hidden bg-[#f8fafc]",
        isDrawingEnabled && "drawing-mode",
        drawing.mode && "draw-tool-active",
        isActiveCanvasStroke && "draw-stroke-active",
        isPresenting && "presenting-map",
      )}
    >
      <MapContainer
        center={LAGUNA_CENTER}
        zoom={11}
        minZoom={4}
        maxZoom={19}
        maxBoundsViscosity={0.75}
        zoomControl={false}
        className="relative z-0 h-full w-full"
        preferCanvas
        zoomSnap={1}
        zoomDelta={1}
        wheelPxPerZoomLevel={120}
        touchZoom="center"
        inertia={true}
        inertiaDeceleration={3000}
        inertiaMaxSpeed={1500}
        easeLinearity={0.2}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
      >
        <TileLayer
          attribution={tileConfig.attribution}
          url={tileConfig.url}
          subdomains={(tileConfig as any).subdomains || "abc"}
          maxZoom={19}
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={4}
          className={uiMapSettings.mapTheme === "dark" ? "osm-dark-tiles" : undefined}
        />
        <ZoomControl position="bottomright" />
        <MapInstanceBridge onReady={handleMapReady} />
        <MapSizeController schools={plottedSchools} />
        <ZoomWatcher onZoomChange={handleZoomChange} />
        <ViewportWatcher onBoundsChange={setCurrentBounds} />
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

        {visibleClusters.map((cluster) => (
          <SchoolMarker
            key={cluster.id}
            cluster={cluster}
            onEditSchool={onEditSchool}
            onMarkerClick={(clickedCluster) => {
              if (clickedCluster.schools.length > 1 && leafletMap) {
                leafletMap.flyTo([clickedCluster.lat, clickedCluster.lng], Math.min(zoom + 2, 16), {
                  duration: 0.5,
                });
              }
              onMarkerClick?.(clickedCluster);
            }}
            isPresenting={isPresenting}
            showLabel={false}
            showNameLabel={uiMapSettings.schoolNameLabels}
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
        <ProgramMapLegend
          analytics={programAnalytics}
          filters={programFilters}
          leftOffset={legendOffsetPx}
          isScholarsMode={isScholarsMode}
        />
      )}

      <div className="absolute right-4 top-4 z-[9999] flex flex-col items-end gap-2" data-gis-draw-occlude="right">
        <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/85 text-card-foreground p-1.5 shadow-2xl backdrop-blur-2xl">
          {onMapSettingChange && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="gis-control-button h-9 w-9 rounded-full"
                  title="Map layers & theme"
                  aria-label="Map layers and theme"
                >
                  <Layers className="control-button-icon h-4 w-4" strokeWidth={1.75} />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                align="end" 
                className="z-[10000] w-[350px] sm:w-[380px] max-h-[85vh] overflow-y-auto p-4 border border-border/60 bg-card/95 shadow-2xl backdrop-blur-2xl rounded-2xl text-foreground gis-custom-scrollbar" 
                sideOffset={10} 
                container={typeof document !== 'undefined' ? document.getElementById('gis-presentation-stage') : null}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Map Customization</h4>
                      <p className="text-[11px] text-muted-foreground">Basemap themes &amp; GIS display</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 rounded-full hover:bg-muted/60"
                    onClick={handleResetMapSettings}
                    title="Reset to default settings"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </Button>
                </div>

                {/* Basemap Styles Grid */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Basemap Style</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">6 Options</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {BASEMAP_OPTIONS.map((opt) => {
                      const isSelected = currentBasemap === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectBasemap(opt.id)}
                          className={cn(
                            "flex flex-col items-start text-left p-2.5 rounded-xl border transition-all text-xs relative overflow-hidden",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-sm font-semibold"
                              : "border-border/60 bg-card/60 hover:bg-muted/50 hover:border-border text-foreground hover:shadow-xs"
                          )}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("p-1 rounded-md", isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                {getBasemapIcon(opt.id)}
                              </span>
                              <span className="font-bold truncate text-[11.5px]">{opt.name}</span>
                            </div>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2.5} />}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{opt.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Performance & Markers */}
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">High Performance</span>
                    </div>
                    <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      60 FPS Mode
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3 py-1">
                      <div className="min-w-0">
                        <Label className="text-xs font-semibold text-foreground cursor-pointer">Marker clustering</Label>
                        <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Merges dense pins to eliminate lag</p>
                      </div>
                      <Switch 
                        checked={uiMapSettings.clusters} 
                        onCheckedChange={(v) => onMapSettingChange("clusters", v)} 
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-1">
                      <div className="min-w-0">
                        <Label className="text-xs font-semibold text-foreground cursor-pointer">School name badges</Label>
                        <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Show titles under pins on high zoom</p>
                      </div>
                      <Switch 
                        checked={uiMapSettings.schoolNameLabels} 
                        onCheckedChange={(v) => onMapSettingChange("schoolNameLabels", v)} 
                      />
                    </div>
                  </div>
                </div>

                {/* GIS Layers & Overlays */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">GIS Layers &amp; Labels</span>
                  </div>
                  <div className="space-y-1 divide-y divide-border/40">
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <Label className="text-xs font-medium text-foreground cursor-pointer">Roads &amp; Highways</Label>
                      <Switch checked={uiMapSettings.roads} onCheckedChange={(v) => onMapSettingChange("roads", v)} />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <Label className="text-xs font-medium text-foreground cursor-pointer">Place &amp; street names</Label>
                      <Switch
                        checked={uiMapSettings.basemapPlaceNames}
                        onCheckedChange={(v) => onMapSettingChange("basemapPlaceNames", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <Label className="text-xs font-medium text-foreground cursor-pointer">Barangay area labels</Label>
                      <Switch
                        checked={uiMapSettings.barangayLabels}
                        onCheckedChange={(v) => onMapSettingChange("barangayLabels", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <Label className="text-xs font-medium text-foreground cursor-pointer">City / municipality labels</Label>
                      <Switch
                        checked={uiMapSettings.cityLabels}
                        onCheckedChange={(v) => onMapSettingChange("cityLabels", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <Label className="text-xs font-medium text-foreground cursor-pointer">GIS overlays</Label>
                      <Switch checked={uiMapSettings.overlays} onCheckedChange={(v) => onMapSettingChange("overlays", v)} />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <Label className="text-xs font-medium text-foreground cursor-pointer">Program legend</Label>
                      <Switch checked={uiMapSettings.programLegend} onCheckedChange={(v) => onMapSettingChange("programLegend", v)} />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {onPresentationChange && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "gis-control-button h-9 w-9 rounded-full",
                isPresenting && "is-active is-presentation-active",
              )}
              title={isPresenting ? "Exit presentation" : "Presentation mode"}
              aria-pressed={isPresenting}
              onClick={() => onPresentationChange(!isPresenting)}
            >
              <MonitorPlay className="control-button-icon h-4 w-4" strokeWidth={1.75} />
            </Button>
          )}

          {onDrawSettingChange && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "gis-control-button h-9 w-9 rounded-full",
                drawSettings.annotationVisibility && "annotation-visibility-on",
              )}
              title={drawSettings.annotationVisibility ? "Hide all annotations" : "Show annotations"}
              aria-pressed={drawSettings.annotationVisibility}
              onClick={() => onDrawSettingChange("annotationVisibility", !drawSettings.annotationVisibility)}
            >
              {drawSettings.annotationVisibility ? (
                <Eye className="annotation-visibility-icon h-4 w-4" strokeWidth={1.75} />
              ) : (
                <EyeOff className="annotation-visibility-icon h-4 w-4" strokeWidth={1.75} />
              )}
            </Button>
          )}

          <Button
            ref={drawButtonRef}
            variant="ghost"
            size="icon"
            className={cn(
              "gis-control-button h-9 w-9 rounded-full transition-transform",
              isDrawingEnabled && "is-active is-draw-active",
            )}
            onClick={() => {
              if (drawSettings.lockDrawingMode && isDrawingEnabled) return;
              setDrawingEnabled(!isDrawingEnabled);
            }}
            aria-label="Toggle drawing tools"
            aria-pressed={isDrawingEnabled}
            title="Draw tools"
          >
            <Pen className="control-button-icon h-4 w-4" strokeWidth={1.75} />
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
