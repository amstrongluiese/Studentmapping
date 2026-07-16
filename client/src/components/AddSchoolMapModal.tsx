import { useState, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Search } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AddSchoolMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSchoolName: string;
  studentAddress?: string;
  onSuccess: (school: any) => void;
}

const mapContainerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "0.5rem"
};

// Default to Laguna, Philippines
const defaultCenter = {
  lat: 14.168,
  lng: 121.243
};

import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_VERSION } from "@/lib/googleMapsConfig";

import { REGION_4A_DATA } from "@shared/region4a";

type Step = "edit" | "confirm";

export function AddSchoolMapModal({ open, onOpenChange, defaultSchoolName, studentAddress, onSuccess }: AddSchoolMapModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("edit");
  const [schoolName, setSchoolName] = useState(defaultSchoolName);
  const [province, setProvince] = useState<string>("Laguna");
  const [municipality, setMunicipality] = useState("");
  const [barangay, setBarangay] = useState("");
  const [markerPosition, setMarkerPosition] = useState<{lat: number, lng: number} | null>(null);

  const isDistantSchool = province === "Other";

  // Load Google Maps script
  const { isLoaded } = useJsApiLoader({
    version: GOOGLE_MAPS_VERSION,
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "", // Use env var
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Initialize places autocomplete
  const {
    ready,
    value: searchValue,
    suggestions: { status, data },
    setValue: setSearchValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "ph" },
      // Bounding box for Region 4A (Calabarzon)
      locationRestriction: {
        north: 15.1, // Polillo Islands
        south: 13.1, // Quezon / Batangas southern tips
        east: 122.7, // Eastern Quezon
        west: 120.5  // Western Cavite / Batangas
      }
    },
    debounce: 300,
    initOnMount: false,
  });

  useEffect(() => {
    if (isLoaded) {
      init();
    }
  }, [isLoaded, init]);

  const mapRef = useRef<google.maps.Map | null>(null);
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (open) {
      setStep("edit");
      setSchoolName(defaultSchoolName);
      setProvince("Laguna");
      setMunicipality("");
      setMarkerPosition(null);
      setSearchValue("");
      clearSuggestions();
    }
  }, [open, defaultSchoolName]);

  // When province changes, clear municipality
  useEffect(() => {
    setMunicipality("");
  }, [province]);

  const geocodeLatLng = useCallback(async (lat: number, lng: number) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results[0]) {
        const addressComponents = response.results[0].address_components;
        let foundMunicipality = "";
        let foundProvince = "";
        let foundBarangay = "";
        
        for (const component of addressComponents) {
          if (component.types.includes("sublocality") || component.types.includes("sublocality_level_1") || component.types.includes("neighborhood")) {
            foundBarangay = component.long_name;
          }
          if (component.types.includes("locality")) {
            foundMunicipality = component.long_name;
          }
          if (component.types.includes("administrative_area_level_2") || component.types.includes("administrative_area_level_1")) {
            if (!foundProvince) {
              foundProvince = component.long_name;
            } else if (component.types.includes("administrative_area_level_2")) {
              foundProvince = component.long_name;
            }
          }
        }
        
        // Auto-update province if it matches Region 4A
        if (foundProvince) {
          const matchedProvince = Object.keys(REGION_4A_DATA).find(
            p => foundProvince.toLowerCase().includes(p.toLowerCase())
          );
          if (matchedProvince) {
            setProvince(matchedProvince);
            
            // Auto-update municipality if it matches the new province's list
            if (foundMunicipality) {
              const matchedMuni = Object.keys(REGION_4A_DATA[matchedProvince as keyof typeof REGION_4A_DATA]).find(
                m => foundMunicipality.toLowerCase().includes(m.toLowerCase())
              );
              if (matchedMuni) {
                setMunicipality(matchedMuni);
                
                // Auto-update barangay if it matches the new municipality's list
                if (foundBarangay) {
                  const matchedBrgy = REGION_4A_DATA[matchedProvince as keyof typeof REGION_4A_DATA][matchedMuni].find(
                    b => foundBarangay.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(foundBarangay.toLowerCase())
                  );
                  if (matchedBrgy) {
                    setBarangay(matchedBrgy);
                  } else {
                    setBarangay("");
                  }
                } else {
                  setBarangay("");
                }
              } else {
                setMunicipality(foundMunicipality);
                setBarangay("");
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Reverse geocoding failed", error);
    }
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      geocodeLatLng(lat, lng);
    }
  }, [geocodeLatLng]);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      geocodeLatLng(lat, lng);
    }
  }, [geocodeLatLng]);

  const executeSearch = async (address: string) => {
    setSearchValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ 
        address,
        bounds: {
          north: 15.1,
          south: 13.1,
          east: 122.7,
          west: 120.5
        },
        componentRestrictions: { country: "ph" }
      });
      const { lat, lng } = await getLatLng(results[0]);
      
      const newPos = { lat, lng };
      setMarkerPosition(newPos);
      if (mapRef.current) {
        mapRef.current.panTo(newPos);
        mapRef.current.setZoom(15);
      }
      
      geocodeLatLng(lat, lng);
    } catch (error) {
      console.error("Error: ", error);
      toast({
        title: "Search failed",
        description: "Could not find that location.",
        variant: "destructive"
      });
    }
  };

  const createSchoolMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        schoolName,
        municipality: municipality || "Unknown",
        province: province === "Other" ? "Outside Region 4A" : province,
        barangay: barangay || undefined,
        latitude: isDistantSchool ? null : (markerPosition?.lat || null),
        longitude: isDistantSchool ? null : (markerPosition?.lng || null)
      };
      
      const res = await apiRequest("POST", "/api/schoolRegistry", payload);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "School created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schoolRegistry"] });
      onSuccess(data);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create school",
        variant: "destructive",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "edit" ? "Add New School" : "Confirm School Details"}</DialogTitle>
          <DialogDescription>
            {step === "edit" 
              ? `Create a new school entry for ${defaultSchoolName}.` 
              : "Please review the details before saving."}
          </DialogDescription>
        </DialogHeader>

        {step === "edit" ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                School Name
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="name"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
                {studentAddress && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    Student Address: {studentAddress}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Province
              </Label>
              <div className="col-span-3">
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(REGION_4A_DATA).map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other (Outside Region 4A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Municipality / City
              </Label>
              <div className="col-span-3">
                {isDistantSchool ? (
                  <Input 
                    value={municipality} 
                    onChange={(e) => setMunicipality(e.target.value)} 
                    placeholder="Enter city/municipality"
                  />
                ) : (
                  <Select value={municipality || undefined} onValueChange={setMunicipality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select municipality" />
                    </SelectTrigger>
                    <SelectContent>
                      {province !== "Other" && REGION_4A_DATA[province as keyof typeof REGION_4A_DATA] && Object.keys(REGION_4A_DATA[province as keyof typeof REGION_4A_DATA]).map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Barangay
              </Label>
              <div className="col-span-3">
                {isDistantSchool ? (
                  <Input 
                    value={barangay} 
                    onChange={(e) => setBarangay(e.target.value)} 
                    placeholder="Enter barangay (optional)"
                  />
                ) : (
                  <Select value={barangay || undefined} onValueChange={setBarangay} disabled={!municipality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      {province !== "Other" && municipality && REGION_4A_DATA[province as keyof typeof REGION_4A_DATA]?.[municipality]?.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {!isDistantSchool && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right mt-2">
                  Map Location
                </Label>
                <div className="col-span-3 space-y-3">
                  {isLoaded ? (
                    <>
                      <div className="border rounded-md overflow-hidden relative">
                        <GoogleMap
                          mapContainerStyle={mapContainerStyle}
                          center={markerPosition || defaultCenter}
                          zoom={markerPosition ? 15 : 10}
                          onClick={handleMapClick}
                          onLoad={onMapLoad}
                          onUnmount={onMapUnmount}
                          options={{
                            mapTypeControl: false,
                            streetViewControl: false,
                          }}
                        >
                          {markerPosition && (
                            <Marker 
                              position={markerPosition} 
                              draggable={true}
                              onDragEnd={handleMarkerDragEnd}
                              animation={window.google.maps.Animation.DROP}
                            />
                          )}
                        </GoogleMap>
                      </div>

                      <div className="relative flex gap-2">
                        <div className="relative flex-1">
                          <Popover open={status === "OK" && data.length > 0}>
                            <PopoverTrigger asChild>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search address or place"
                                  value={searchValue}
                                  onChange={(e) => setSearchValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && searchValue) {
                                      executeSearch(searchValue);
                                    }
                                  }}
                                  disabled={!ready}
                                  className="pl-9"
                                />
                              </div>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-[var(--radix-popover-trigger-width)] p-0" 
                              onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                              <div className="max-h-[300px] overflow-y-auto">
                                {data.map(({ place_id, description }) => (
                                  <div
                                    key={place_id}
                                    className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm flex items-start gap-2"
                                    onClick={() => executeSearch(description)}
                                  >
                                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                    <span>{description}</span>
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Button 
                          variant="secondary" 
                          onClick={() => executeSearch(searchValue)}
                          disabled={!searchValue}
                        >
                          Search
                        </Button>
                      </div>

                      {markerPosition && (
                        <p className="text-xs text-muted-foreground">
                          Pinned coordinates: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] border rounded-md bg-slate-50">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {isDistantSchool && (
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-start-2 col-span-3 p-4 bg-amber-50 text-amber-800 rounded-md text-sm border border-amber-200">
                  <MapPin className="h-5 w-5 mb-2 text-amber-600" />
                  <strong>Distant School Mode:</strong> Since this school is outside Region 4A, map coordinates are not required and will be skipped.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg border space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-muted-foreground font-medium">School Name:</span>
                <span className="col-span-2 font-semibold">{schoolName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-muted-foreground font-medium">Province:</span>
                <span className="col-span-2">{province === "Other" ? "Outside Region 4A" : province}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-muted-foreground font-medium">Municipality/City:</span>
                <span className="col-span-2">{municipality || "Not specified"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-muted-foreground font-medium">Barangay:</span>
                <span className="col-span-2">{barangay || "Not specified"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="text-muted-foreground font-medium">Classification:</span>
                <span className="col-span-2">{isDistantSchool ? "Distant School (Malayong School)" : "Local School (Region 4A)"}</span>
              </div>
              {!isDistantSchool && (
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Coordinates:</span>
                  <span className="col-span-2">
                    {markerPosition 
                      ? `${markerPosition.lat.toFixed(6)}, ${markerPosition.lng.toFixed(6)}` 
                      : <span className="text-red-500">No coordinates pinned</span>}
                  </span>
                </div>
              )}
            </div>
            
            {!isDistantSchool && !markerPosition && (
              <p className="text-sm text-red-500 font-medium bg-red-50 p-3 rounded border border-red-200">
                Warning: You have not pinned a location on the map. This school will be saved without coordinates.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          {step === "edit" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep("confirm")} 
                disabled={!schoolName || !municipality || (!isDistantSchool && !markerPosition)}
              >
                Review Details
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("edit")} disabled={createSchoolMutation.isPending}>
                Back to Edit
              </Button>
              <Button 
                onClick={() => createSchoolMutation.mutate()} 
                disabled={createSchoolMutation.isPending}
              >
                {createSchoolMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & Save
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
