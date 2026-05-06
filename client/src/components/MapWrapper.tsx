import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSchools } from "@/hooks/use-schools";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Edit2, Map as MapIcon, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import type { School } from "@shared/schema";
import { cn } from "@/lib/utils";
import { DrawingToolbar } from "@/components/DrawingToolbar";

const LAGUNA_BOUNDS: L.LatLngBoundsExpression = [
  [13.8824, 121.0118],
  [14.4533, 121.5645]
];

export interface MapOverlays {
  showCounts: boolean;
  showLabels: boolean;
  showDrawings: boolean;
}

const getMarkerColor = (count: number) => {
  if (count <= 5) return { fill: "#10b981", shadow: "#10b98140", border: "#059669" };
  if (count <= 10) return { fill: "#f59e0b", shadow: "#f59e0b40", border: "#d97706" };
  return { fill: "#ef4444", shadow: "#ef444440", border: "#dc2626" };
};

const createMarkerIcon = (count: number, name: string, showCount: boolean, showLabel: boolean) => {
  const { fill, shadow, border } = getMarkerColor(count);
  const truncatedName = name.length > 28 ? name.slice(0, 28) + "…" : name;

  return L.divIcon({
    html: `
      <div class="gis-marker-root" style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div class="gis-pin-body" style="
          width:38px;height:38px;
          background:${fill};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 4px 16px ${shadow}, 0 1px 4px rgba(0,0,0,0.15);
          border:2.5px solid ${border};
          display:flex;align-items:center;justify-content:center;
          transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s ease;
        ">
          ${showCount ? `<span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:800;font-family:sans-serif;letter-spacing:-0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.25);">${count}</span>` : ''}
        </div>
        ${showLabel ? `
        <div class="gis-label" style="
          position:absolute;left:calc(100% + 8px);top:50%;transform:translateY(-50%);
          background:rgba(255,255,255,0.97);
          backdrop-filter:blur(8px);
          border:1px solid rgba(0,0,0,0.08);
          padding:3px 8px;border-radius:6px;
          box-shadow:0 2px 8px rgba(0,0,0,0.08);
          white-space:nowrap;pointer-events:none;
          font-size:11px;font-weight:700;font-family:sans-serif;
          color:#1e293b;
          transition:opacity 0.2s ease,transform 0.2s ease;
        ">${truncatedName}</div>` : ''}
      </div>
    `,
    className: "custom-leaflet-icon",
    iconSize: [38, 46],
    iconAnchor: [19, 46],
    popupAnchor: [0, -48],
  });
};

interface MapWrapperProps {
  onAddSchool: (lat: number, lng: number) => void;
  onEditSchool: (school: School) => void;
  isPresenting?: boolean;
  isTouring?: boolean;
  isDrawing?: boolean;
  onDrawingClose?: () => void;
  overlays?: MapOverlays;
}

function MapInteractionHandler({
  onAddSchool, isPresenting, isDrawing
}: { onAddSchool: (lat: number, lng: number) => void; isPresenting: boolean; isDrawing: boolean }) {
  useMapEvents({
    click(e) {
      if (!isPresenting && !isDrawing) {
        onAddSchool(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function TourHandler({ isTouring, schools }: { isTouring: boolean; schools: School[] | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!isTouring || !schools || schools.length === 0) return;
    const top = [...schools].sort((a, b) => b.studentCount - a.studentCount).slice(0, 6);
    let idx = 0;
    const t = setInterval(() => {
      map.flyTo([top[idx].lat, top[idx].lng], 13, { duration: 2.2, easeLinearity: 0.4 });
      idx = (idx + 1) % top.length;
    }, 5000);
    return () => clearInterval(t);
  }, [isTouring, schools, map]);
  return null;
}

export default function MapWrapper({
  onAddSchool,
  onEditSchool,
  isPresenting = false,
  isTouring = false,
  isDrawing = false,
  onDrawingClose,
  overlays = { showCounts: true, showLabels: true, showDrawings: true },
}: MapWrapperProps) {
  const { data: schools } = useSchools();
  const [mounted, setMounted] = useState(false);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const totalStudents = useMemo(() => schools?.reduce((s, sc) => s + sc.studentCount, 0) || 0, [schools]);
  const topSchool = useMemo(() => [...(schools || [])].sort((a, b) => b.studentCount - a.studentCount)[0], [schools]);

  if (!mounted) return (
    <div className="h-full w-full bg-[#f8f6f0] animate-pulse flex items-center justify-center">
      <MapIcon className="w-12 h-12 text-muted-foreground opacity-15" />
    </div>
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        center={[14.1667, 121.25]}
        zoom={11}
        minZoom={10}
        maxBounds={LAGUNA_BOUNDS}
        maxBoundsViscosity={0.85}
        zoomControl={false}
        className="h-full w-full z-0"
      >
        <InvalidateMapSize />
        <TourHandler isTouring={isTouring} schools={schools} />

        {/* CartoDB Positron — minimalist, elegant, no visual noise */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Zoom bottom-left, clear of sidebar and drawing toolbar */}
        <ZoomControl position="bottomleft" />

        <MapInteractionHandler
          onAddSchool={onAddSchool}
          isPresenting={isPresenting}
          isDrawing={isDrawing}
        />

        {isDrawing && onDrawingClose && overlays.showDrawings && (
          <DrawingToolbar onClose={onDrawingClose} />
        )}

        {schools?.map((school) => (
          <Marker
            key={school.id}
            position={[school.lat, school.lng]}
            icon={createMarkerIcon(school.studentCount, school.name, overlays.showCounts, overlays.showLabels)}
          >
            {!isPresenting && (
              <Popup className="custom-popup border-0" minWidth={220}>
                <div className="p-4">
                  <h4 className="font-bold text-base leading-tight mb-0.5">{school.name}</h4>
                  {(school.municipality || school.institutionType) && (
                    <p className="text-[11px] text-muted-foreground mb-3">
                      {school.municipality}{school.institutionType ? ` · ${school.institutionType}` : ""}
                    </p>
                  )}
                  <div className="bg-primary/8 border border-primary/15 rounded-xl p-3 mb-3">
                    <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest mb-0.5">Trimex Enrollees</p>
                    <p className="text-2xl font-black text-primary leading-none">{school.studentCount}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3 text-primary/60 flex-shrink-0" />
                    {school.municipality || "Laguna Province"}
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2 h-8 text-xs" onClick={() => onEditSchool(school)}>
                    <Edit2 className="w-3.5 h-3.5" />
                    Update Enrollment
                  </Button>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>

      {/* Presentation Mode Panels */}
      {isPresenting && (
        <>
          {/* Density Legend — Bottom Left (above zoom) */}
          <div className={cn(
            "absolute bottom-20 left-4 z-[1000] bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/60 transition-all duration-300 overflow-hidden",
            isLegendCollapsed ? "w-10 h-10" : "w-44 p-4"
          )}>
            {isLegendCollapsed ? (
              <button className="w-full h-full flex items-center justify-center hover:bg-gray-100/80 rounded-2xl transition-colors" onClick={() => setIsLegendCollapsed(false)}>
                <ChevronUp className="h-4 w-4 text-gray-600" />
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Density</p>
                  <button className="h-5 w-5 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors" onClick={() => setIsLegendCollapsed(true)}>
                    <ChevronDown className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
                {[["#10b981", "1–5 Students"], ["#f59e0b", "6–10 Students"], ["#ef4444", "11+ Students"]].map(([color, label]) => (
                  <div key={color} className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium text-foreground">{label}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Stats Summary — Top Right */}
          <div className={cn(
            "absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/60 transition-all duration-300 overflow-hidden",
            isStatsCollapsed ? "w-10 h-10" : "w-52 p-4"
          )}>
            {isStatsCollapsed ? (
              <button className="w-full h-full flex items-center justify-center hover:bg-gray-100/80 rounded-2xl transition-colors" onClick={() => setIsStatsCollapsed(false)}>
                <ChevronDown className="h-4 w-4 text-gray-600" />
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-primary" />
                    <p className="text-xs font-bold">Analytics</p>
                  </div>
                  <button className="h-5 w-5 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors" onClick={() => setIsStatsCollapsed(true)}>
                    <ChevronUp className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
                {[
                  { label: "Schools", value: String(schools?.length || 0) },
                  { label: "Total Enrollees", value: totalStudents.toLocaleString(), accent: true },
                  { label: "Top Feeder", value: topSchool?.name || "N/A", small: true },
                ].map(({ label, value, accent, small }) => (
                  <div key={label} className="mb-2.5">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{label}</p>
                    <p className={cn("font-black leading-tight mt-0.5", accent ? "text-lg text-primary" : small ? "text-xs truncate" : "text-base")}>{value}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
