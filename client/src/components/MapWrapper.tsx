import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSchools } from "@/hooks/use-schools";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Edit2, Map as MapIcon, Info, History, GraduationCap } from "lucide-react";
import type { School } from "@shared/schema";

// Laguna Province Approx Bounding Box
const LAGUNA_BOUNDS: L.LatLngBoundsExpression = [
  [13.8824, 121.0118], // SouthWest
  [14.4533, 121.5645]  // NorthEast
];

// Pin color logic:
// Green → 1–5 students
// Yellow → 6–10 students
// Red → 11+ students
const getMarkerColor = (count: number) => {
  if (count <= 5) return "#22c55e"; // Green
  if (count <= 10) return "#eab308"; // Yellow
  return "#ef4444"; // Red
};

const createClusterIcon = (count: number, name: string, isPresentation: boolean) => {
  const color = getMarkerColor(count);
  return L.divIcon({
    html: `
      <div class="custom-marker-wrapper group cursor-pointer">
        <div class="relative flex flex-col items-center">
          <div class="text-3xl drop-shadow-md filter hover:scale-110 transition-transform" style="color: ${color}">
            📍
          </div>
          
          <div class="absolute -top-2 -right-2 min-w-[20px] h-[20px] flex items-center justify-center px-1 text-white text-[10px] font-bold rounded-full shadow-md border border-background" style="background-color: ${color}">
            ${count}
          </div>
          
          <!-- Permanent Floating Label -->
          <div class="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-card/90 backdrop-blur-sm border border-border px-2 py-1 rounded-md shadow-sm whitespace-nowrap pointer-events-none transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:scale-105 group-hover:shadow-md">
            <span class="text-[11px] font-bold">${name}</span>
          </div>
        </div>
      </div>
    `,
    className: 'custom-leaflet-icon',
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
}

function MapInteractionHandler({ onAddSchool, isPresenting }: { onAddSchool: (lat: number, lng: number) => void; isPresenting: boolean }) {
  useMapEvents({
    click(e) {
      if (!isPresenting) {
        onAddSchool(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
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

export default function MapWrapper({ onAddSchool, onEditSchool, isPresenting = false, isTouring = false }: MapWrapperProps) {
  const { data: schools, isLoading } = useSchools();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalStudents = useMemo(() => schools?.reduce((sum, s) => sum + s.studentCount, 0) || 0, [schools]);
  const topSchool = useMemo(() => [...(schools || [])].sort((a, b) => b.studentCount - a.studentCount)[0], [schools]);

  if (!mounted) return <div className="h-full w-full bg-muted/50 animate-pulse flex items-center justify-center">
    <MapIcon className="w-12 h-12 text-muted-foreground opacity-20" />
  </div>;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[14.1667, 121.2500]}
        zoom={11}
        minZoom={10}
        maxBounds={LAGUNA_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        className="h-full w-full bg-[#f8f9fa] dark:bg-[#0f172a] z-0"
      >
        <InvalidateMapSize />
        <TourHandler isTouring={isTouring} schools={schools} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={isPresenting 
            ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          }
          className={isPresenting ? "grayscale" : "map-tiles-light"}
        />
        
        {!isPresenting && <ZoomControl position="topright" />}
        <MapInteractionHandler onAddSchool={onAddSchool} isPresenting={isPresenting} />

        {schools?.map((school) => (
          <Marker
            key={school.id}
            position={[school.lat, school.lng]}
            icon={createClusterIcon(school.studentCount, school.name, isPresenting)}
          >
            {!isPresenting && (
              <Popup className="custom-popup border-0">
                <div className="p-4 min-w-[200px]">
                  <h4 className="font-display font-bold text-lg leading-tight mb-1 pr-4">{school.name}</h4>
                  <p className="text-xs text-muted-foreground mb-3 italic">(Originating School)</p>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="truncate">Laguna Province</span>
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
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full hover-elevate"
                    onClick={() => onEditSchool(school)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Update Enrollment
                  </Button>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>

      {isPresenting && (
        <>
          {/* Legend */}
          <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-border min-w-[180px]">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-muted-foreground">Student Density</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
                <span className="text-sm font-medium text-foreground">1–5 Students</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#eab308]" />
                <span className="text-sm font-medium text-foreground">6–10 Students</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <span className="text-sm font-medium text-foreground">11+ Students</span>
              </div>
            </div>
          </div>

          {/* Stats Summary Panel */}
          <div className="absolute top-6 right-6 z-[1000] bg-white/90 backdrop-blur-md p-5 rounded-xl shadow-xl border border-border min-w-[240px]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Quick Summary</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Schools Mapped</p>
                <p className="text-xl font-black text-foreground">{schools?.length || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Students</p>
                <p className="text-xl font-black text-primary">{totalStudents.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Top Source School</p>
                <p className="text-sm font-bold text-foreground truncate">{topSchool?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Province</p>
                <p className="text-sm font-bold text-foreground">Laguna</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BarChart2({ className }: { className?: string }) {
  return <BarChart2Icon className={className} />;
}

import { BarChart2 as BarChart2Icon } from "lucide-react";
