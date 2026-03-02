import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSchools } from "@/hooks/use-schools";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Edit2, Map as MapIcon } from "lucide-react";
import type { School } from "@shared/schema";

// Laguna Province Approx Bounding Box
const LAGUNA_BOUNDS: L.LatLngBoundsExpression = [
  [13.8824, 121.0118], // SouthWest
  [14.4533, 121.5645]  // NorthEast
];

// Helper to create beautiful HTML icons
const createClusterIcon = (count: number, name: string) => {
  return L.divIcon({
    html: `
      <div class="custom-marker-wrapper group cursor-pointer">
        <div class="relative flex flex-col items-center">
          <div class="text-3xl drop-shadow-md filter hover:scale-110 transition-transform">
            📍
          </div>
          
          <div class="absolute -top-2 -right-2 min-w-[20px] h-[20px] flex items-center justify-center px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full shadow-md border border-background">
            ${count}
          </div>
          
          <!-- Tooltip on hover -->
          <div class="absolute top-full mt-1 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            ${name}
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
}

function MapInteractionHandler({ onAddSchool }: { onAddSchool: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onAddSchool(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapWrapper({ onAddSchool, onEditSchool }: MapWrapperProps) {
  const { data: schools, isLoading } = useSchools();
  const [mounted, setMounted] = useState(false);

  // Fix hydration issues with react-leaflet in Next/Vite
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-full w-full bg-muted/50 animate-pulse flex items-center justify-center">
    <MapIcon className="w-12 h-12 text-muted-foreground opacity-20" />
  </div>;

  return (
    <MapContainer
      center={[14.1667, 121.2500]}
      zoom={11}
      minZoom={10}
      maxBounds={LAGUNA_BOUNDS}
      maxBoundsViscosity={0.8}
      zoomControl={false} // We add it manually for positioning
      className="h-full w-full bg-[#f8f9fa] dark:bg-[#0f172a] z-0"
    >
      {/* Sleek map tiles: CartoDB Positron for light, Dark Matter for dark */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        className="map-tiles-light"
      />
      
      <ZoomControl position="topright" />
      <MapInteractionHandler onAddSchool={onAddSchool} />

      {schools?.map((school) => (
        <Marker
          key={school.id}
          position={[school.lat, school.lng]}
          icon={createClusterIcon(school.studentCount, school.name)}
        >
          <Popup className="custom-popup border-0">
            <div className="p-4 min-w-[200px]">
              <h4 className="font-display font-bold text-lg leading-tight mb-2 pr-4">{school.name}</h4>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="truncate">Lat: {school.lat.toFixed(4)}, Lng: {school.lng.toFixed(4)}</span>
              </div>
              
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between mb-4">
                <span className="text-sm font-semibold">Enrolled</span>
                <div className="flex items-center gap-1.5 text-primary font-bold">
                  <Users className="w-4 h-4" />
                  <span>{school.studentCount} Students</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full hover-elevate"
                onClick={() => onEditSchool(school)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
