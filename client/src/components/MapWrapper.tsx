import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSchools } from "@/hooks/use-schools";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Edit2, Map as MapIcon, Info, History, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import type { School } from "@shared/schema";
import { cn } from "@/lib/utils";

// Laguna Province Approx Bounding Box
const LAGUNA_BOUNDS: L.LatLngBoundsExpression = [
  [13.8824, 121.0118], // SouthWest
  [14.4533, 121.5645]  // NorthEast
];

const getMarkerColor = (count: number) => {
  if (count <= 5) return "#22c55e"; // Green
  if (count <= 10) return "#eab308"; // Yellow
  return "#ef4444"; // Red
};

const createClusterIcon = (count: number, name: string) => {
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

function MapControls() {
  const map = useMap();
  
  useEffect(() => {
    // Home Control - Reset to initial bounds
    const homeControl = L.control({ position: 'bottomleft' });
    homeControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'leaflet-control-home leaflet-bar');
      div.innerHTML = '<a href="#" title="Go to Laguna bounds">🏠</a>';
      div.querySelector('a')?.addEventListener('click', (e) => {
        e.preventDefault();
        map.fitBounds(LAGUNA_BOUNDS, { padding: [50, 50] });
      });
      return div;
    };
    homeControl.addTo(map);

    // Download Control - Export as image
    const downloadControl = L.control({ position: 'topright' });
    downloadControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'leaflet-control-download leaflet-bar');
      div.innerHTML = '<a href="#" title="Download map as image">⬇️</a>';
      div.querySelector('a')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Map download feature coming soon!');
      });
      return div;
    };
    downloadControl.addTo(map);

    return () => {
      map.removeControl(homeControl);
      map.removeControl(downloadControl);
    };
  }, [map]);

  return null;
}

export default function MapWrapper({ onAddSchool, onEditSchool, isPresenting = false, isTouring = false }: MapWrapperProps) {
  const { data: schools, isLoading } = useSchools();
  const [mounted, setMounted] = useState(false);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalStudents = useMemo(() => schools?.reduce((sum, s) => sum + s.studentCount, 0) || 0, [schools]);
  const topSchool = useMemo(() => [...(schools || [])].sort((a, b) => b.studentCount - a.studentCount)[0], [schools]);

  if (!mounted) return <div className="h-full w-full bg-muted/50 animate-pulse flex items-center justify-center">
    <MapIcon className="w-12 h-12 text-muted-foreground opacity-20" />
  </div>;

  return (
    <div className="relative h-full w-full overflow-hidden border-0 m-0 p-0">
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
        <MapControls />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          className="map-tiles-light"
        />
        
        {!isPresenting && <ZoomControl position="topright" />}
        <MapInteractionHandler onAddSchool={onAddSchool} isPresenting={isPresenting} />

        {schools?.map((school) => (
          <Marker
            key={school.id}
            position={[school.lat, school.lng]}
            icon={createClusterIcon(school.studentCount, school.name)}
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
          {/* Legend - Bottom Left */}
          <div className={cn(
            "absolute bottom-6 left-6 z-[1000] bg-white/80 backdrop-blur-md rounded-xl shadow-xl border border-border transition-all duration-300 overflow-hidden",
            isLegendCollapsed ? "w-10 h-10 p-0" : "w-48 p-4"
          )}>
            <div className="flex items-center justify-between mb-3">
              {!isLegendCollapsed && <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Density</h4>}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 absolute top-2 right-2" 
                onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
              >
                {isLegendCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
            {!isLegendCollapsed && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                  <span className="text-xs font-medium">1–5 Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                  <span className="text-xs font-medium">6–10 Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                  <span className="text-xs font-medium">11+ Students</span>
                </div>
              </div>
            )}
            {isLegendCollapsed && (
              <div className="flex items-center justify-center h-full">
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Stats Summary Panel - Top Right */}
          <div className={cn(
            "absolute top-6 right-6 z-[1000] bg-white/80 backdrop-blur-md rounded-xl shadow-xl border border-border transition-all duration-300 overflow-hidden",
            isStatsCollapsed ? "w-10 h-10 p-0" : "w-56 p-5"
          )}>
            <div className="flex items-center justify-between mb-4">
              {!isStatsCollapsed && (
                <div className="flex items-center gap-2">
                  <BarChart2Icon className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Summary</h3>
                </div>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 absolute top-2 right-2" 
                onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
              >
                {isStatsCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              </Button>
            </div>
            {!isStatsCollapsed && (
              <div className="space-y-3 mt-2">
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Schools</p>
                  <p className="text-lg font-black">{schools?.length || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total Enrollees</p>
                  <p className="text-lg font-black text-primary">{totalStudents.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Top Feeder</p>
                  <p className="text-xs font-bold truncate pr-4">{topSchool?.name || "N/A"}</p>
                </div>
              </div>
            )}
            {isStatsCollapsed && (
              <div className="flex items-center justify-center h-full">
                <BarChart2Icon className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import { BarChart2 as BarChart2Icon } from "lucide-react";
