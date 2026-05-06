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

const getMarkerColor = (count: number) => {
  if (count <= 5) return "#22c55e";
  if (count <= 10) return "#eab308";
  return "#ef4444";
};

const createClusterIcon = (count: number, name: string) => {
  const color = getMarkerColor(count);
  return L.divIcon({
    html: `
      <div class="custom-marker-wrapper group cursor-pointer">
        <div class="relative flex flex-col items-center">
          <div class="text-3xl drop-shadow-md filter hover:scale-110 transition-transform" style="color: ${color}">📍</div>
          <div class="absolute -top-2 -right-2 min-w-[20px] h-[20px] flex items-center justify-center px-1 text-white text-[10px] font-bold rounded-full shadow-md border border-background" style="background-color: ${color}">${count}</div>
          <div class="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-card/90 backdrop-blur-sm border border-border px-2 py-1 rounded-md shadow-sm whitespace-nowrap pointer-events-none transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:scale-105 group-hover:shadow-md">
            <span class="text-[11px] font-bold">${name}</span>
          </div>
        </div>
      </div>`,
    className: "custom-leaflet-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface MapWrapperProps {
  onAddSchool: (lat: number, lng: number) => void;
  onEditSchool: (school: School) => void;
  isPresenting?: boolean;
  isTouring?: boolean;
  isDrawing?: boolean;
  onDrawingClose?: () => void;
}

function MapInteractionHandler({ onAddSchool, isPresenting, isDrawing }: { onAddSchool: (lat: number, lng: number) => void; isPresenting: boolean; isDrawing: boolean }) {
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
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function TourHandler({ isTouring, schools }: { isTouring: boolean; schools: School[] | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!isTouring || !schools || schools.length === 0) return;
    const topSchools = [...schools].sort((a, b) => b.studentCount - a.studentCount).slice(0, 5);
    let index = 0;
    const tourInterval = setInterval(() => {
      const school = topSchools[index];
      map.flyTo([school.lat, school.lng], 14, { duration: 2 });
      index = (index + 1) % topSchools.length;
    }, 5000);
    return () => clearInterval(tourInterval);
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
}: MapWrapperProps) {
  const { data: schools } = useSchools();
  const [mounted, setMounted] = useState(false);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const totalStudents = useMemo(() => schools?.reduce((sum, s) => sum + s.studentCount, 0) || 0, [schools]);
  const topSchool = useMemo(() => [...(schools || [])].sort((a, b) => b.studentCount - a.studentCount)[0], [schools]);

  if (!mounted) return (
    <div className="h-full w-full bg-muted/50 animate-pulse flex items-center justify-center">
      <MapIcon className="w-12 h-12 text-muted-foreground opacity-20" />
    </div>
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        center={[14.1667, 121.2500]}
        zoom={11}
        minZoom={10}
        maxBounds={LAGUNA_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        className="h-full w-full z-0"
      >
        <InvalidateMapSize />
        <TourHandler isTouring={isTouring} schools={schools} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {!isPresenting && <ZoomControl position="topright" />}
        <MapInteractionHandler onAddSchool={onAddSchool} isPresenting={isPresenting} isDrawing={isDrawing} />

        {isDrawing && onDrawingClose && <DrawingToolbar onClose={onDrawingClose} />}

        {schools?.map((school) => (
          <Marker
            key={school.id}
            position={[school.lat, school.lng]}
            icon={createClusterIcon(school.studentCount, school.name)}
          >
            {!isPresenting && (
              <Popup className="custom-popup border-0">
                <div className="p-4 min-w-[200px]">
                  <h4 className="font-display font-bold text-lg leading-tight mb-0.5 pr-4">{school.name}</h4>
                  {school.municipality && (
                    <p className="text-xs text-muted-foreground mb-1">{school.municipality}{school.institutionType ? ` · ${school.institutionType}` : ""}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{school.municipality || "Laguna Province"}</span>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex flex-col gap-1 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trimex Enrollment</span>
                      <Users className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="text-xl font-bold text-primary">
                      {school.studentCount} <span className="text-xs font-normal text-primary/70">Students</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full hover-elevate" onClick={() => onEditSchool(school)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Update Enrollment
                  </Button>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>

      {/* Presentation overlay panels */}
      {isPresenting && (
        <>
          {/* Legend - Bottom Left */}
          <div className={cn(
            "absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-border transition-all duration-300 overflow-hidden",
            isLegendCollapsed ? "w-10 h-10" : "w-48 p-4"
          )}>
            {isLegendCollapsed ? (
              <button className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors" onClick={() => setIsLegendCollapsed(false)}>
                <ChevronUp className="h-4 w-4 text-gray-700" />
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Density</h4>
                  <button className="h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors" onClick={() => setIsLegendCollapsed(true)}>
                    <ChevronDown className="h-4 w-4 text-gray-700" />
                  </button>
                </div>
                <div className="space-y-2">
                  {[["#22c55e", "1–5 Students"], ["#eab308", "6–10 Students"], ["#ef4444", "11+ Students"]].map(([color, label]) => (
                    <div key={color} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Stats Summary - Top Right */}
          <div className={cn(
            "absolute top-6 right-6 z-[1000] bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-border transition-all duration-300 overflow-hidden",
            isStatsCollapsed ? "w-10 h-10" : "w-56 p-5"
          )}>
            {isStatsCollapsed ? (
              <button className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors" onClick={() => setIsStatsCollapsed(false)}>
                <ChevronDown className="h-4 w-4 text-gray-700" />
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm">Summary</h3>
                  </div>
                  <button className="h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors" onClick={() => setIsStatsCollapsed(true)}>
                    <ChevronUp className="h-4 w-4 text-gray-700" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Schools</p>
                    <p className="text-lg font-black">{schools?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total Enrollees</p>
                    <p className="text-lg font-black text-primary">{totalStudents.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Top Feeder</p>
                    <p className="text-xs font-bold truncate">{topSchool?.name || "N/A"}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
