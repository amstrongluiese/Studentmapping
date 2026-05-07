import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSchools } from "@/hooks/use-schools";
import { Button } from "@/components/ui/button";
import { MapPin, Edit2, Map as MapIcon, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import type { School } from "@shared/schema";
import { cn } from "@/lib/utils";
import { DrawingToolbar } from "@/components/DrawingToolbar";

const LAGUNA_BOUNDS: L.LatLngBoundsExpression = [
  [13.8824, 121.0118],
  [14.4533, 121.5645],
];

export interface MapOverlays {
  showCounts: boolean;
  showLabels: boolean;
  showDrawings: boolean;
}

const getMarkerStyle = (count: number) => {
  if (count <= 50)  return { fill: "#10d9a0", shadow: "#10d9a050", border: "#0bbf8a" };
  if (count <= 200) return { fill: "#fbbf24", shadow: "#fbbf2450", border: "#d97706" };
  return               { fill: "#f87171", shadow: "#f8717150", border: "#ef4444" };
};

const createMarkerIcon = (count: number, name: string, showCount: boolean, showLabel: boolean) => {
  const { fill, shadow, border } = getMarkerStyle(count);
  const label = name.length > 26 ? name.slice(0, 26) + "…" : name;

  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="
          width:36px;height:36px;
          background:${fill};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 4px 18px ${shadow},0 1px 6px rgba(0,0,0,0.35);
          border:2.5px solid ${border};
          display:flex;align-items:center;justify-content:center;
          transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        ">
          ${showCount ? `<span style="transform:rotate(45deg);color:#0c1220;font-size:10px;font-weight:900;font-family:sans-serif;letter-spacing:-0.5px;">${count > 999 ? "999+" : count}</span>` : ""}
        </div>
        ${showLabel ? `
        <div style="
          position:absolute;left:calc(100% + 7px);top:50%;transform:translateY(-50%);
          background:rgba(13,18,34,0.90);
          backdrop-filter:blur(10px);
          -webkit-backdrop-filter:blur(10px);
          border:1px solid rgba(255,255,255,0.12);
          padding:3px 8px;border-radius:6px;
          box-shadow:0 2px 10px rgba(0,0,0,0.5);
          white-space:nowrap;pointer-events:none;
          font-size:11px;font-weight:700;font-family:sans-serif;
          color:#d6e4f8;
        ">${label}</div>` : ""}
      </div>`,
    className: "custom-leaflet-icon",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
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

function MapInteractionHandler({ onAddSchool, isPresenting, isDrawing }: {
  onAddSchool: (lat: number, lng: number) => void;
  isPresenting: boolean;
  isDrawing: boolean;
}) {
  useMapEvents({
    click(e) {
      if (!isPresenting && !isDrawing) onAddSchool(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function TourHandler({ isTouring, schools }: { isTouring: boolean; schools: School[] | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!isTouring || !schools?.length) return;
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
  onAddSchool, onEditSchool,
  isPresenting = false, isTouring = false, isDrawing = false,
  onDrawingClose,
  overlays = { showCounts: true, showLabels: true, showDrawings: true },
}: MapWrapperProps) {
  const { data: schools } = useSchools();
  const [mounted, setMounted] = useState(false);
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const totalStudents = useMemo(() => schools?.reduce((s, sc) => s + sc.studentCount, 0) || 0, [schools]);
  const topSchool = useMemo(() => [...(schools || [])].sort((a, b) => b.studentCount - a.studentCount)[0], [schools]);

  if (!mounted) return (
    <div className="h-full w-full flex items-center justify-center" style={{ background: "#0c1220" }}>
      <MapIcon className="w-12 h-12 opacity-10" style={{ color: "#10d9a0" }} />
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

        {/* CartoDB Dark Matter — clean dark tiles matching dark theme */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

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
              <Popup minWidth={220} maxWidth={260}>
                <div className="p-4">
                  <h4 className="font-bold text-sm leading-tight mb-1" style={{ color: "#d6e4f8" }}>
                    {school.name}
                  </h4>
                  {(school.municipality || school.institutionType) && (
                    <p className="text-[11px] mb-3" style={{ color: "#7b8fa8" }}>
                      {school.municipality}{school.institutionType ? ` · ${school.institutionType}` : ""}
                    </p>
                  )}
                  <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(16,217,160,0.08)", border: "1px solid rgba(16,217,160,0.15)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#10d9a080" }}>Trimex Enrollees</p>
                    <p className="text-2xl font-black leading-none" style={{ color: "#10d9a0" }}>{school.studentCount}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: "#7b8fa8" }}>
                    <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: "#10d9a060" }} />
                    {school.municipality || "Laguna Province"}
                  </div>
                  <button
                    className="w-full h-8 text-xs font-semibold rounded-lg border transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ background: "rgba(16,217,160,0.12)", border: "1px solid rgba(16,217,160,0.25)", color: "#10d9a0" }}
                    onClick={() => onEditSchool(school)}
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Update Enrollment
                  </button>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>

      {/* ── Presentation Mode Overlays ── */}
      {isPresenting && (
        <>
          {/* Density Legend */}
          <div className={cn(
            "absolute bottom-20 left-4 z-[1000] rounded-2xl transition-all duration-300 overflow-hidden",
            legendCollapsed ? "w-10 h-10" : "w-44 p-4"
          )} style={{ background: "rgba(13,18,34,0.90)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(16px)" }}>
            {legendCollapsed ? (
              <button className="w-full h-full flex items-center justify-center" onClick={() => setLegendCollapsed(false)}>
                <ChevronUp className="h-4 w-4" style={{ color: "#7b8fa8" }} />
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#7b8fa8" }}>Density</p>
                  <button onClick={() => setLegendCollapsed(true)}>
                    <ChevronDown className="h-3 w-3" style={{ color: "#7b8fa8" }} />
                  </button>
                </div>
                {[["#10d9a0","1–50 Students"],["#fbbf24","51–200 Students"],["#f87171","201+ Students"]].map(([color, label]) => (
                  <div key={color} className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }} />
                    <span className="text-xs font-medium" style={{ color: "#d6e4f8" }}>{label}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Analytics Summary */}
          <div className={cn(
            "absolute top-4 right-4 z-[1000] rounded-2xl transition-all duration-300 overflow-hidden",
            statsCollapsed ? "w-10 h-10" : "w-52 p-4"
          )} style={{ background: "rgba(13,18,34,0.90)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(16px)" }}>
            {statsCollapsed ? (
              <button className="w-full h-full flex items-center justify-center" onClick={() => setStatsCollapsed(false)}>
                <ChevronDown className="h-4 w-4" style={{ color: "#7b8fa8" }} />
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5" style={{ color: "#10d9a0" }} />
                    <p className="text-xs font-bold" style={{ color: "#d6e4f8" }}>Analytics</p>
                  </div>
                  <button onClick={() => setStatsCollapsed(true)}>
                    <ChevronUp className="h-3 w-3" style={{ color: "#7b8fa8" }} />
                  </button>
                </div>
                {[
                  { label: "Schools", value: String(schools?.length || 0) },
                  { label: "Total Enrollees", value: totalStudents.toLocaleString(), accent: true },
                  { label: "Top Feeder", value: topSchool?.name || "N/A", small: true },
                ].map(({ label, value, accent, small }) => (
                  <div key={label} className="mb-3">
                    <p className="text-[8px] font-bold uppercase tracking-widest leading-none mb-0.5" style={{ color: "#7b8fa8" }}>{label}</p>
                    <p className={cn("font-black leading-tight", small && "text-xs truncate")}
                      style={{ fontSize: accent ? "1.1rem" : small ? undefined : "0.95rem", color: accent ? "#10d9a0" : "#d6e4f8" }}>
                      {value}
                    </p>
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
