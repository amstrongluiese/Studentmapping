import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, MapPin, AlertCircle, Edit2, Trash2, Check } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { REGION_4A_DATA } from "@shared/region4a";
import { inferSchoolType } from "@/lib/utils";

interface BatchGeocodeReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolsToProcess: { name: string; address: string }[];
  existingSchools?: any[];
  onComplete: () => void;
  onResolveMatch?: (schoolName: string, selectedSchool: any) => void;
}

import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_VERSION } from "@/lib/googleMapsConfig";

interface GeocodeResult {
  name: string;
  studentAddress: string;
  status: "pending" | "success" | "failed";
  foundAddress?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  lat?: number;
  lng?: number;
  errorReason?: string;
  isEditing?: boolean;
  isDiscarded?: boolean;
  duplicateOf?: any;
  schoolType?: string;
}

export function BatchGeocodeReviewModal({
  open,
  onOpenChange,
  schoolsToProcess,
  existingSchools = [],
  onComplete,
  onResolveMatch
}: BatchGeocodeReviewModalProps) {
  const { toast } = useToast();
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { isLoaded, loadError } = useJsApiLoader({
    version: GOOGLE_MAPS_VERSION,
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  
  // Track if we've already started processing for this open cycle
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (open && schoolsToProcess.length > 0 && !hasStartedRef.current && isLoaded) {
      hasStartedRef.current = true;
      startBatchGeocode();
    }
    
    if (!open) {
      hasStartedRef.current = false;
      setResults([]);
    }
  }, [open, schoolsToProcess, isLoaded]);

  const extractLocationComponents = (addressComponents: any[]) => {
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
        // In the Philippines, Province is typically level 2, but sometimes level 1 depending on city independence
        if (!foundProvince) {
          foundProvince = component.long_name;
        } else if (component.types.includes("administrative_area_level_2")) {
          // Level 2 takes precedence for Province
          foundProvince = component.long_name;
        }
      }
    }
    
    let province = "Outside Region 4A";
    let municipality = foundMunicipality || "Unknown";

    if (foundProvince) {
      const matchedProvince = Object.keys(REGION_4A_DATA).find(
        p => foundProvince.toLowerCase().includes(p.toLowerCase())
      );
      if (matchedProvince) {
        province = matchedProvince;
        if (foundMunicipality) {
          const matchedMuni = Object.keys(REGION_4A_DATA[matchedProvince as keyof typeof REGION_4A_DATA]).find(
            m => foundMunicipality.toLowerCase().includes(m.toLowerCase())
          );
          if (matchedMuni) municipality = matchedMuni;
        }
      }
    }

    return { province, municipality, barangay: foundBarangay };
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const startBatchGeocode = async () => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      toast({
        title: "Google Maps Error",
        description: "Google Maps API is not loaded yet.",
        variant: "destructive"
      });
      onOpenChange(false);
      return;
    }

    setIsProcessing(true);
    
    // Initialize results array with pending status
    const initialResults: GeocodeResult[] = schoolsToProcess.map(s => ({
      name: s.name,
      studentAddress: s.address,
      status: "pending",
      schoolType: inferSchoolType(s.name) || "Unknown"
    }));
    setResults([...initialResults]);

    const geocoder = new window.google.maps.Geocoder();

    for (let i = 0; i < schoolsToProcess.length; i++) {
      const school = schoolsToProcess[i];
      
      // Smart word-by-word duplication check against existing registry
      const searchWords = school.name.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !['school', 'high', 'elementary', 'national'].includes(w));
      let bestMatch: any = null;
      let maxMatches = 0;

      for (const existing of existingSchools) {
        const existingWords = existing.schoolName.toLowerCase().split(/\s+/);
        let matches = 0;
        for (const w of searchWords) {
          if (existingWords.some((ew: string) => ew.includes(w) || w.includes(ew))) {
            matches++;
          }
        }
        if (matches > maxMatches && matches >= Math.max(1, searchWords.length * 0.5)) {
          maxMatches = matches;
          bestMatch = existing;
        }
      }

      if (bestMatch) {
        setResults(prev => prev.map((r, idx) => idx === i ? { 
          ...r, 
          status: "success", 
          duplicateOf: bestMatch, 
          foundAddress: bestMatch.municipality + ", " + bestMatch.province 
        } : r));
        continue; // Skip geocoding if found in local masterlist
      }

      const primaryQuery = `${school.name}, Philippines`;
      let fallbackQuery = primaryQuery;
      if (school.address) {
        fallbackQuery = `${school.name}, ${school.address}, Philippines`;
      }
      
      try {
        let geocodeResult: any = null;

        const isGeneric = (result: any) => {
          return result.types.includes("administrative_area_level_1") || 
                 result.types.includes("administrative_area_level_2") || 
                 result.types.includes("country") ||
                 result.types.includes("locality");
        };

        const executeGeocode = (query: string): Promise<any> => {
           return new Promise((resolve, reject) => {
             geocoder.geocode({ address: query, region: "ph" }, (results, status) => {
               if (status === "OK" && results && results.length > 0) {
                 resolve(results[0]);
               } else {
                 reject(status);
               }
             });
           });
        };

        let primaryRes: any = null;

        try {
           const res = await executeGeocode(primaryQuery);
           primaryRes = res;
           if (!isGeneric(res) || fallbackQuery === primaryQuery) {
              geocodeResult = res;
           }
        } catch (err) {}

        if (!geocodeResult && fallbackQuery !== primaryQuery) {
           try {
              const res = await executeGeocode(fallbackQuery);
              if (!isGeneric(res) || !primaryRes) {
                 geocodeResult = res;
              } else {
                 geocodeResult = primaryRes;
              }
           } catch (err) {
              geocodeResult = primaryRes;
           }
        }
        
        if (!geocodeResult && primaryRes) {
           geocodeResult = primaryRes;
        }

        if (!geocodeResult) throw new Error("Not found");

        const lat = geocodeResult.geometry.location.lat();
        const lng = geocodeResult.geometry.location.lng();
        
        const { province, municipality, barangay } = extractLocationComponents(geocodeResult.address_components);

        setResults(prev => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: "success",
            foundAddress: geocodeResult.formatted_address,
            province,
            municipality,
            barangay,
            lat,
            lng
          };
          return next;
        });

      } catch (error) {
        setResults(prev => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: "failed",
            errorReason: "Could not find matching location"
          };
          return next;
        });
      }
      
      // Delay to avoid hitting API rate limits too quickly
      await delay(400);
    }

    setIsProcessing(false);
  };

  const handleSaveAll = async () => {
    const successfulMatches = results.filter(r => r.status === "success");
    if (successfulMatches.length === 0) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    let successCount = 0;

    for (const match of successfulMatches) {
      if (match.isDiscarded) continue;
      
      try {
        if (match.duplicateOf) {
          // If it's a merge candidate, we just resolve it to the existing school
          if (onResolveMatch) {
            onResolveMatch(match.name, match.duplicateOf);
          }
          successCount++;
        } else {
          // It's a brand new school
          const payload = {
            schoolName: match.name,
            municipality: match.municipality || "Unknown",
            province: match.province === "Other" ? "Outside Region 4A" : match.province,
            barangay: match.barangay || undefined,
            latitude: match.lat,
            longitude: match.lng,
            schoolType: match.schoolType && match.schoolType !== "Unknown" ? match.schoolType : undefined
          };
          
          const res = await apiRequest("POST", "/api/schoolRegistry", payload);
          const newSchool = await res.json();
          
          if (onResolveMatch) {
            onResolveMatch(match.name, newSchool);
          }
          
          successCount++;
        }
      } catch (error) {
        console.error("Failed to save", match.name, error);
      }
    }

    setIsSaving(false);
    toast({
      title: "Batch Geocoding Complete",
      description: `Successfully saved ${successCount} out of ${successfulMatches.length} valid schools.`,
    });
    
    queryClient.invalidateQueries({ queryKey: ["/api/schoolRegistry"] });
    onComplete();
    onOpenChange(false);
  };

  const pendingCount = results.filter(r => r.status === "pending").length;
  const successCount = results.filter(r => r.status === "success").length;
  const failedCount = results.filter(r => r.status === "failed").length;

  return (
    <Dialog open={open} onOpenChange={(val) => !isProcessing && !isSaving && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Batch Auto-Geocode Review</DialogTitle>
          <DialogDescription>
            {isProcessing 
              ? `Processing ${schoolsToProcess.length} schools using Google Maps...` 
              : "Review the found locations before saving."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 py-2 border-b">
          <Badge variant="secondary" className="bg-slate-100">Total: {schoolsToProcess.length}</Badge>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">Pending: {pendingCount}</Badge>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Found: {successCount}</Badge>
          <Badge variant="secondary" className="bg-red-50 text-red-700">Failed/Discarded: {failedCount}</Badge>
        </div>
        
        <div className="mx-4 mt-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-md flex items-start gap-2 border border-amber-200">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> 
          <div>
            <strong>Note:</strong> Auto-geocoding may not be 100% accurate. Please review the details below. You can <strong>Edit Details</strong> if the province/municipality is mismatched, or <strong>Discard</strong> the entry if the location is completely wrong (you can add it manually later).
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 min-h-[300px] mt-2">
          <div className="space-y-4 py-4 px-4">
            {results.map((result, idx) => {
              if (result.isDiscarded) return null;
              
              return (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border relative ${
                  result.status === "success" ? "border-emerald-200 bg-emerald-50/50" : 
                  result.status === "failed" ? "border-red-200 bg-red-50/50" : 
                  "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">{result.name}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Student Address: {result.studentAddress || "None"}
                    </p>
                  </div>
                  <div>
                    {result.status === "pending" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                    {result.status === "success" && !result.duplicateOf && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    {result.status === "success" && result.duplicateOf && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Merge Candidate</Badge>
                    )}
                    {result.status === "failed" && <XCircle className="h-5 w-5 text-red-500" />}
                  </div>
                </div>
                
                {result.status === "success" && !result.duplicateOf && result.province === "Outside Region 4A" && (
                  <Badge variant="destructive" className="mt-1 text-[10px]">Outside Region 4A</Badge>
                )}

                {result.status === "success" && !result.duplicateOf && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    <div className="grid grid-cols-4 gap-4">
                      {result.isEditing ? (
                        <div className="grid grid-cols-4 gap-2 col-span-4">
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-xs">Province</span>
                            <Select 
                              value={result.province || undefined} 
                              onValueChange={(v) => {
                                const next = [...results];
                                next[idx].province = v;
                                next[idx].municipality = ""; 
                                setResults(next);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.keys(REGION_4A_DATA).map(p => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                                <SelectItem value="Other">Outside Region 4A</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-xs">Municipality / City</span>
                            {result.province === "Other" ? (
                              <Input
                                value={result.municipality || ""}
                                onChange={(e) => {
                                  const next = [...results];
                                  next[idx].municipality = e.target.value;
                                  setResults(next);
                                }}
                                className="h-8 text-xs bg-white"
                                placeholder="Enter municipality/city"
                              />
                            ) : (
                              <Select 
                                value={result.municipality || undefined} 
                                onValueChange={(v) => {
                                  const next = [...results];
                                  next[idx].municipality = v;
                                  next[idx].barangay = ""; 
                                  setResults(next);
                                }}
                                disabled={!result.province}
                              >
                                <SelectTrigger className="h-8 text-xs bg-white">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {result.province && result.province !== "Other" && REGION_4A_DATA[result.province as keyof typeof REGION_4A_DATA] && Object.keys(REGION_4A_DATA[result.province as keyof typeof REGION_4A_DATA]).map(m => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-xs">Barangay</span>
                            {result.province === "Other" ? (
                              <Input
                                value={result.barangay || ""}
                                onChange={(e) => {
                                  const next = [...results];
                                  next[idx].barangay = e.target.value;
                                  setResults(next);
                                }}
                                className="h-8 text-xs bg-white"
                                placeholder="Enter barangay"
                              />
                            ) : (
                              <Select 
                                value={result.barangay || undefined} 
                                onValueChange={(v) => {
                                  const next = [...results];
                                  next[idx].barangay = v;
                                  setResults(next);
                                }}
                                disabled={!result.municipality || !result.province}
                              >
                                <SelectTrigger className="h-8 text-xs bg-white">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {result.province && result.province !== "Other" && result.municipality && REGION_4A_DATA[result.province as keyof typeof REGION_4A_DATA]?.[result.municipality]?.map(b => (
                                    <SelectItem key={b} value={b}>{b}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-xs">Type</span>
                            <Select 
                              value={result.schoolType || "Unknown"} 
                              onValueChange={(v) => {
                                const next = [...results];
                                next[idx].schoolType = v;
                                setResults(next);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {["Unknown", "Elementary", "High School", "Senior High School", "College", "University", "Vocational", "Special Education"].map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ) : (
                        <div className="col-span-4 flex items-center justify-between text-xs">
                          <div className="flex gap-4">
                            <div>
                              <span className="text-muted-foreground">Province: </span>
                              <span className="font-medium">{result.province || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">City/Muni: </span>
                              <span className="font-medium">{result.municipality || "N/A"}</span>
                            </div>
                            {result.barangay && (
                              <div>
                                <span className="text-muted-foreground">Brgy: </span>
                                <span className="font-medium">{result.barangay}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Type: </span>
                              <span className="font-medium">{result.schoolType || "Unknown"}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-emerald-100">
                      {result.isEditing ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          onClick={() => {
                            const next = [...results];
                            next[idx].isEditing = false;
                            setResults(next);
                          }}
                        >
                          <Check className="w-3 h-3 mr-1" /> Done
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs bg-white"
                          onClick={() => {
                            const next = [...results];
                            next[idx].isEditing = true;
                            setResults(next);
                          }}
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Edit Details
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="h-7 text-xs"
                        onClick={() => {
                          const next = [...results];
                          next[idx].isDiscarded = true;
                          setResults(next);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Discard
                      </Button>
                    </div>
                  </div>
                )}

                {result.status === "success" && result.duplicateOf && (
                  <div className="mt-3 pt-3 border-t border-amber-100 text-sm">
                    <p className="text-amber-800 text-xs">
                      <strong>Highly Similar School Found:</strong> This record will be merged with <strong>{result.duplicateOf.schoolName}</strong> instead of creating a new school.
                    </p>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="h-7 text-xs"
                        onClick={() => {
                          const next = [...results];
                          next[idx].isDiscarded = true;
                          setResults(next);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Discard
                      </Button>
                    </div>
                  </div>
                )}
                
                {result.status === "failed" && (
                  <div className="mt-2 text-xs text-red-600">
                    {result.errorReason} - Will be skipped.
                  </div>
                )}
              </div>
            )})}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing || isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAll} 
            disabled={isProcessing || isSaving || successCount === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm & Save All ({successCount})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
