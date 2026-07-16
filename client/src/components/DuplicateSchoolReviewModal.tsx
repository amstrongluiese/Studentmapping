import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, MapPin, Edit, Combine, Navigation } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import type { SchoolRegistry as School } from "@shared/schema";
import { useMergeSchool } from "@/hooks/use-schools";

interface DuplicateSchoolReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateSchool: School | null;
  originalSchool: School | null;
  onDeleteDuplicate: (school: School) => Promise<void>;
  onEdit?: (school: School) => void;
  onGeocode?: (school: School) => Promise<void>;
  studentOriginsMap?: Map<number, string>;
}

const mapContainerStyle = {
  width: "100%",
  height: "250px",
  borderRadius: "0.5rem"
};

const defaultCenter = {
  lat: 14.2,
  lng: 121.2
};

import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_VERSION } from "@/lib/googleMapsConfig";

export function DuplicateSchoolReviewModal({
  open,
  onOpenChange,
  duplicateSchool,
  originalSchool,
  onDeleteDuplicate,
  onEdit,
  onGeocode,
  studentOriginsMap,
}: DuplicateSchoolReviewModalProps) {
  const [step, setStep] = useState<"review" | "merged">("review");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const mergeSchool = useMergeSchool();
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    version: GOOGLE_MAPS_VERSION,
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Auto fit bounds to show both pins if they have coordinates
    if (originalSchool?.latitude && duplicateSchool?.latitude && step === "review") {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: originalSchool.latitude, lng: originalSchool.longitude! });
      bounds.extend({ lat: duplicateSchool.latitude, lng: duplicateSchool.longitude! });
      map.fitBounds(bounds);
      
      // Prevent zooming in too much if they are at the exact same spot
      const listener = window.google.maps.event.addListener(map, "idle", () => { 
        if (map.getZoom()! > 18) map.setZoom(18); 
        window.google.maps.event.removeListener(listener); 
      });
    } else if (originalSchool?.latitude) {
      map.setCenter({ lat: originalSchool.latitude, lng: originalSchool.longitude! });
      map.setZoom(15);
    } else if (duplicateSchool?.latitude) {
      map.setCenter({ lat: duplicateSchool.latitude, lng: duplicateSchool.longitude! });
      map.setZoom(15);
    }
  }, [originalSchool, duplicateSchool, step]);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleDelete = async () => {
    if (!duplicateSchool || !originalSchool) return;
    setIsDeleting(true);
    try {
      // Force transfer (merge) on delete as requested
      await mergeSchool.mutateAsync({ duplicateId: duplicateSchool.id, targetId: originalSchool.id });
      setStep("merged");
    } catch (e) {
      // Error handled by parent
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMerge = async () => {
    if (!duplicateSchool || !originalSchool) return;
    setIsMerging(true);
    try {
      await mergeSchool.mutateAsync({ duplicateId: duplicateSchool.id, targetId: originalSchool.id });
      setStep("merged");
    } catch (e) {
      // Error handled by hook
    } finally {
      setIsMerging(false);
    }
  };

  const renderComparisonField = (label: string, originalVal: string | null | undefined, duplicateVal: string | null | undefined) => (
    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 py-2 text-sm">
      <div className="pr-2 border-r border-slate-100">
        <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{label}</span>
        <span className="font-medium text-slate-900">{originalVal || "—"}</span>
      </div>
      <div className="pl-2">
        <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{label} (Duplicate)</span>
        <span className="font-medium text-amber-700">{duplicateVal || "—"}</span>
      </div>
    </div>
  );

  if (!duplicateSchool || !originalSchool) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isDeleting && !isMerging) {
        onOpenChange(val);
        if (!val) {
          // Reset step after a short delay so the animation hides it before switching
          setTimeout(() => setStep("review"), 300);
        }
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-amber-800">
            {step === "review" ? "Review Duplicate Entry" : "Record Merged Successfully"}
          </DialogTitle>
          <DialogDescription>
            {step === "review" 
              ? <>The system flagged <strong>{duplicateSchool.schoolName}</strong> as a duplicate of an existing record. Please review the details below before deleting.</>
              : <>The duplicate record has been merged into the original record. You can now Geocode or Edit the updated original record.</>}
          </DialogDescription>
          
          {(studentOriginsMap?.has(duplicateSchool.id) || (originalSchool && studentOriginsMap?.has(originalSchool.id))) && (
            <div className="bg-primary/10 text-primary px-3 py-2 rounded-md text-sm font-medium mt-2">
              <strong>Supporting Demographics:</strong>
              {originalSchool && studentOriginsMap?.has(originalSchool.id) && <div>• Original: Students mostly from {studentOriginsMap.get(originalSchool.id)}</div>}
              {studentOriginsMap?.has(duplicateSchool.id) && <div>• Duplicate: Students mostly from {studentOriginsMap.get(duplicateSchool.id)}</div>}
            </div>
          )}
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="rounded-md border border-slate-200 overflow-hidden bg-slate-50">
            <div className="grid grid-cols-2 bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-600">
              <div className="p-3 border-r border-slate-200 flex items-center justify-between">
                <span>{step === "review" ? "Original Record" : "Merged Record"}</span>
                {onEdit && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-500 hover:text-slate-900" onClick={() => onEdit(originalSchool)}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                )}
              </div>
              <div className="p-3 text-amber-800 flex items-center justify-between">
                <span>{step === "review" ? "Duplicate Record" : ""}</span>
                {onEdit && step === "review" && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-amber-600 hover:text-amber-900" onClick={() => onEdit(duplicateSchool)}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                )}
              </div>
            </div>
            <div className="p-4">
              {renderComparisonField("School Name", originalSchool.schoolName, step === "review" ? duplicateSchool.schoolName : undefined)}
              {renderComparisonField("Normalized Name", originalSchool.normalizedSchoolName, step === "review" ? duplicateSchool.normalizedSchoolName : undefined)}
              {renderComparisonField("Type", originalSchool.schoolType, step === "review" ? duplicateSchool.schoolType : undefined)}
              {renderComparisonField("Municipality", originalSchool.municipality, step === "review" ? duplicateSchool.municipality : undefined)}
              {renderComparisonField("Address", originalSchool.address, step === "review" ? duplicateSchool.address : undefined)}
              {renderComparisonField("Source", originalSchool.source, step === "review" ? duplicateSchool.source : undefined)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" /> Geolocation Context
              </h4>
              {onGeocode && step === "review" && (
                <div className="flex gap-2">
                  {!originalSchool.latitude && (
                    <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => onGeocode(originalSchool)}>
                      <Navigation className="h-3 w-3 mr-1" /> Geolocate Original
                    </Button>
                  )}
                  {!duplicateSchool.latitude && (
                    <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => onGeocode(duplicateSchool)}>
                      <Navigation className="h-3 w-3 mr-1" /> Geolocate Duplicate
                    </Button>
                  )}
                </div>
              )}
              {onGeocode && step === "merged" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => onGeocode(originalSchool)}>
                    <Navigation className="h-3 w-3 mr-1" /> Geolocate Updated Record
                  </Button>
                </div>
              )}
            </div>
            
            <div className="rounded-md overflow-hidden border border-slate-200 shadow-sm relative">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={defaultCenter}
                  zoom={12}
                  onLoad={onMapLoad}
                  onUnmount={onMapUnmount}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: "cooperative",
                  }}
                >
                  {originalSchool.latitude && originalSchool.longitude && (
                    <Marker 
                      position={{ lat: originalSchool.latitude, lng: originalSchool.longitude }} 
                      label={{ text: step === "review" ? "O" : "★", color: "white", className: "font-bold" }}
                    />
                  )}
                  {step === "review" && duplicateSchool.latitude && duplicateSchool.longitude && (
                    <Marker 
                      position={{ lat: duplicateSchool.latitude, lng: duplicateSchool.longitude }} 
                      label={{ text: "D", color: "white", className: "font-bold" }}
                    />
                  )}
                </GoogleMap>
              ) : (
                <div className="w-full h-[250px] bg-slate-100 flex items-center justify-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading Map...
                </div>
              )}
            </div>
            
            <div className="flex gap-4 text-xs mt-2 text-slate-600">
              {step === "review" ? (
                <>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">O</span>
                    Original Record
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">D</span>
                    Duplicate Record
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1 text-green-700 font-medium">
                  <span className="inline-block w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">★</span>
                  Merged Master Record
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:justify-between items-center">
          {step === "review" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting || isMerging}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || isMerging}>
                  {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Force Delete & Transfer
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleMerge}
                  disabled={isDeleting || isMerging}
                  className="gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  {isMerging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Combine className="h-4 w-4" />}
                  Merge into Original
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button variant="default" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
