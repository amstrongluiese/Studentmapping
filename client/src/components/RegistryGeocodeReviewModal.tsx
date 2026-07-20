import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, MapPin, AlertCircle, Trash2, Edit2, RefreshCw, X, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useJsApiLoader } from "@react-google-maps/api";
import type { SchoolRegistry as School } from "@shared/schema";
import { inferSchoolType } from "@/lib/utils";
import { detectLocationMismatch, isAmbiguousSchoolName, buildSmartGeocodeQuery } from "@shared/locationIntelligence";

import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_VERSION } from "@/lib/googleMapsConfig";

interface RegistryGeocodeReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolsToProcess: School[];
  onComplete: () => void;
  studentOriginsMap?: Map<number, string>;
  onEditSchool?: (school: School) => void;
}

interface GeocodeResult {
  schoolId: number;
  name: string;
  searchQuery: string;   // editable search query used for geocoding
  status: "pending" | "processing" | "success" | "failed";
  foundAddress?: string;
  lat?: number;
  lng?: number;
  municipality?: string;
  province?: string;
  errorReason?: string;
  isDiscarded?: boolean;
  isEditingQuery?: boolean;
  editQueryDraft?: string;
  duplicateOf?: string;
  schoolType?: string;
  /** Location mismatch detection */
  mismatchStatus?: "ok" | "name-mismatch" | "multi-campus" | "retried" | "manually-edited";
  mismatchMessage?: string;
}

function findDuplicate(lat: number, lng: number, currentId: number, allSchools: School[]): string | undefined {
  for (const s of allSchools) {
    if (s.id !== currentId && s.latitude && s.longitude) {
      const dLat = s.latitude - lat;
      const dLng = s.longitude - lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < 0.0005) { // Roughly 50 meters
        return s.schoolName;
      }
    }
  }
  return undefined;
}

async function geocodeSingle(
  geocoder: google.maps.Geocoder,
  searchQuery: string,
  originalSchoolName?: string,
  fallbackLocationHint?: string
): Promise<{
  lat: number; lng: number; foundAddress: string; municipality: string; province: string;
  actualQueryUsed: string;
}> {
  let response;
  let actualQueryUsed = searchQuery;
  let res;

  const isGeneric = (result: google.maps.GeocoderResult) => {
    return result.types.includes("administrative_area_level_1") || 
           result.types.includes("administrative_area_level_2") || 
           result.types.includes("country") ||
           result.types.includes("locality");
  };

  let primaryRes: any = null;

  try {
    // Step 1: Try the primary query
    response = await geocoder.geocode({ address: searchQuery, region: "ph" });
    if (response.results && response.results.length > 0) {
       res = response.results[0];
       primaryRes = res;
       
       // If generic and we have an unedited query + a fallback hint, force fallback
       if (isGeneric(res) && originalSchoolName && searchQuery === `${originalSchoolName}, Philippines` && fallbackLocationHint) {
          res = null;
       }
    }
  } catch (err) {
    // primary search failed, proceed to fallback if eligible
  }

  // Step 2: Fallback to localized search if primary failed or was generic
  if (!res && originalSchoolName && searchQuery === `${originalSchoolName}, Philippines` && fallbackLocationHint) {
     const fallbackQuery = `${originalSchoolName}, ${fallbackLocationHint}, Philippines`;
     try {
       const fallbackResponse = await geocoder.geocode({ address: fallbackQuery, region: "ph" });
       if (fallbackResponse.results && fallbackResponse.results.length > 0) {
          const fallbackRes = fallbackResponse.results[0];
          // ONLY accept fallback if it is NOT generic, or if the primary search didn't even find a generic area
          if (!isGeneric(fallbackRes) || !primaryRes) {
             res = fallbackRes;
             actualQueryUsed = fallbackQuery;
          } else {
             // Fallback is also generic, but we had a primary generic result (like "Camarines Norte").
             // Stick to the primary result!
             res = primaryRes;
          }
       }
     } catch (err) {
       // fallback failed, stick to primary generic if exists
       res = primaryRes;
     }
  }

  // If fallback was never attempted but res was cleared to null (to force fallback), restore it if fallback was skipped
  if (!res && primaryRes) {
     res = primaryRes;
  }

  if (!res) {
     throw new Error("No results found on Google Maps.");
  }

  // STRICT GEOCODING (Task 4): If the result is just a generic city/province instead of the actual school,
  // we strictly reject it so the user can manually pin it instead of dropping it in the middle of nowhere.
  if (isGeneric(res)) {
     throw new Error("Strict Mode: Found generic city/province bounds instead of an exact establishment. Please pin manually.");
  }
  
  const lat = res.geometry.location.lat();
  const lng = res.geometry.location.lng();
  let municipality = "";
  let province = "";
  for (const comp of res.address_components) {
    if (comp.types.includes("locality")) municipality = comp.long_name;
    if (comp.types.includes("administrative_area_level_2")) province = comp.long_name;
    if (!province && comp.types.includes("administrative_area_level_1")) province = comp.long_name;
  }
  return { lat, lng, foundAddress: res.formatted_address, municipality, province, actualQueryUsed };
}

export function RegistryGeocodeReviewModal({
  open,
  onOpenChange,
  schoolsToProcess,
  onComplete,
  studentOriginsMap,
  onEditSchool
}: RegistryGeocodeReviewModalProps) {
  const { toast } = useToast();
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: allSchools = [] } = useQuery<School[]>({ queryKey: ["/api/schoolRegistry"] });

  const { isLoaded } = useJsApiLoader({
    version: GOOGLE_MAPS_VERSION,
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

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

  // Keep results in sync with any manual edits done via SchoolFormDialog
  useEffect(() => {
    if (results.length === 0 || allSchools.length === 0) return;

    setResults(currentResults => {
      let hasChanges = false;
      const newResults = currentResults.map(r => {
        const dbSchool = allSchools.find(s => s.id === r.schoolId);
        if (dbSchool && dbSchool.source === "Google Geocoding Manual Assist" && dbSchool.latitude && dbSchool.longitude) {
          // If the DB already has manual coordinates, but our result doesn't reflect this
          if (r.mismatchStatus !== "manually-edited") {
            hasChanges = true;
            return {
              ...r,
              status: "success",
              lat: dbSchool.latitude,
              lng: dbSchool.longitude,
              municipality: dbSchool.municipality || r.municipality,
              province: dbSchool.province || r.province,
              foundAddress: dbSchool.address || "Manually set via map",
              isDiscarded: true, // Auto-discard so we don't overwrite the manual edit on batch save
              mismatchStatus: "manually-edited",
              mismatchMessage: "Manually corrected. Skipped for batch save.",
            } as GeocodeResult;
          }
        }
        return r;
      });
      return hasChanges ? newResults : currentResults;
    });
  }, [allSchools]);

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const buildQuery = (school: School) => {
    const studentHint = studentOriginsMap?.get(school.id);
    const smart = buildSmartGeocodeQuery(school.schoolName, {
      municipality: school.municipality || undefined,
      studentOriginHint: studentHint,
    });
    return smart.query;
  };

  const getFallbackHint = (school: School) => {
    if (school.municipality) return school.municipality;
    if (studentOriginsMap?.has(school.id)) return studentOriginsMap.get(school.id);
    return undefined;
  };

  const startBatchGeocode = async () => {
    if (!window.google?.maps?.places) {
      toast({ title: "Google Maps Error", description: "Google Maps API is not loaded.", variant: "destructive" });
      onOpenChange(false);
      return;
    }
    setIsProcessing(true);
    const initial: GeocodeResult[] = schoolsToProcess.map((s) => ({
      schoolId: s.id,
      name: s.schoolName,
      searchQuery: buildQuery(s),
      status: "pending",
      schoolType: inferSchoolType(s.schoolName) || s.schoolType || "Unknown",
    }));
    setResults([...initial]);

    const geocoder = new window.google.maps.Geocoder();
    for (let i = 0; i < schoolsToProcess.length; i++) {
      setResults((cur) => {
        const next = [...cur];
        next[i] = { ...next[i], status: "processing" };
        return next;
      });
      try {
        const originalSchool = schoolsToProcess.find(s => s.id === initial[i].schoolId);
        const hint = originalSchool ? getFallbackHint(originalSchool) : undefined;
        
        const geo = await geocodeSingle(geocoder, initial[i].searchQuery, initial[i].name, hint);
        const dupName = findDuplicate(geo.lat, geo.lng, initial[i].schoolId, allSchools);
        
        // ── Location Mismatch Detection ──────────────────────────────────
        const studentHint = studentOriginsMap?.get(initial[i].schoolId);
        const mismatch = detectLocationMismatch(
          initial[i].name,
          geo.province || "",
          geo.municipality || "",
          studentHint,
        );
        
        let mismatchStatus: GeocodeResult["mismatchStatus"] = "ok";
        let mismatchMessage: string | undefined;
        
        if (mismatch.hasMismatch) {
          mismatchStatus = "name-mismatch";
          mismatchMessage = mismatch.message;
        } else if (mismatch.isAmbiguous) {
          mismatchStatus = "multi-campus";
          mismatchMessage = mismatch.message;
        }
        
        // For ambiguous schools (AMA, STI, etc.): if first geocode was a generic
        // query and we have student origin data, auto-retry with enriched query
        let finalGeo = geo;
        if (mismatch.isAmbiguous && mismatch.suggestedQuery && mismatch.suggestedQuery !== initial[i].searchQuery) {
          try {
            await delay(300);
            const retryGeo = await geocodeSingle(geocoder, mismatch.suggestedQuery, initial[i].name, hint);
            finalGeo = retryGeo;
            mismatchStatus = "retried";
            mismatchMessage = `Auto-retried with student demographics: ${studentHint}`;
          } catch {
            // Keep original result on retry failure
          }
        }
        
        const finalDupName = findDuplicate(finalGeo.lat, finalGeo.lng, initial[i].schoolId, allSchools);
        
        setResults((cur) => {
          const next = [...cur];
          next[i] = { 
            ...next[i], 
            status: "success", 
            ...finalGeo,
            searchQuery: finalGeo.actualQueryUsed,
            duplicateOf: finalDupName,
            mismatchStatus,
            mismatchMessage, 
          };
          return next;
        });
      } catch (err: any) {
        setResults((cur) => {
          const next = [...cur];
          next[i] = { ...next[i], status: "failed", errorReason: err.message || "Failed to find coordinates" };
          return next;
        });
      }
      await delay(400);
    }
    setIsProcessing(false);
  };

  // Re-geocode a single row using its current searchQuery
  const retryRow = async (index: number) => {
    if (!window.google?.maps?.places) return;
    const geocoder = new window.google.maps.Geocoder();
    setResults((cur) => {
      const next = [...cur];
      next[index] = { ...next[index], status: "processing", errorReason: undefined };
      return next;
    });
    try {
      const query = results[index].searchQuery;
      const originalSchool = schoolsToProcess.find(s => s.id === results[index].schoolId);
      const hint = originalSchool ? getFallbackHint(originalSchool) : undefined;
      
      const geo = await geocodeSingle(geocoder, query, results[index].name, hint);
      const dupName = findDuplicate(geo.lat, geo.lng, results[index].schoolId, allSchools);
      setResults((cur) => {
        const next = [...cur];
        next[index] = { 
          ...next[index], 
          status: "success", 
          ...geo,
          searchQuery: geo.actualQueryUsed,
          duplicateOf: dupName 
        };
        return next;
      });
    } catch (err: any) {
      setResults((cur) => {
        const next = [...cur];
        next[index] = { ...next[index], status: "failed", errorReason: err.message || "Failed" };
        return next;
      });
    }
  };

  const startEditQuery = (index: number) => {
    setResults((cur) => {
      const next = [...cur];
      next[index] = { ...next[index], isEditingQuery: true, editQueryDraft: next[index].searchQuery };
      return next;
    });
  };

  const cancelEditQuery = (index: number) => {
    setResults((cur) => {
      const next = [...cur];
      next[index] = { ...next[index], isEditingQuery: false, editQueryDraft: undefined };
      return next;
    });
  };

  const confirmEditAndRetry = async (index: number) => {
    const draft = results[index].editQueryDraft?.trim();
    if (!draft) return;
    setResults((cur) => {
      const next = [...cur];
      next[index] = { ...next[index], searchQuery: draft, isEditingQuery: false, editQueryDraft: undefined };
      return next;
    });
    // small wait so state settles
    await delay(50);
    await retryRow(index);
  };

  const toggleDiscard = (index: number) => {
    setResults((cur) => {
      const next = [...cur];
      next[index] = { ...next[index], isDiscarded: !next[index].isDiscarded };
      return next;
    });
  };

  const handleSave = async () => {
    const toSave = results.filter((r) => r.status === "success" && !r.isDiscarded && r.lat && r.lng);
    if (toSave.length === 0) {
      toast({ title: "Nothing to save", description: "No successfully geocoded schools selected." });
      return;
    }
    setIsSaving(true);
    try {
      await Promise.all(
        toSave.map((r) => {
          let schoolType = r.schoolType;
          if (!schoolType || schoolType === "Unknown") {
            const original = schoolsToProcess.find((s) => s.id === r.schoolId);
            schoolType = original?.schoolType || undefined;
            if (!schoolType || schoolType === "Unknown") {
              schoolType = inferSchoolType(r.name) || "Unknown";
            }
          }

          return apiRequest("PUT", `/api/schoolRegistry/${r.schoolId}`, {
            latitude: r.lat,
            longitude: r.lng,
            isActive: true,
            source: "Bulk Geocoding Manual Assist",
            schoolType: schoolType !== "Unknown" ? schoolType : undefined,
            ...(r.municipality ? { municipality: r.municipality } : {}),
            ...(r.province ? { province: r.province } : {}),
          });
        })
      );
      toast({ title: "Updates Saved", description: `Successfully updated ${toSave.length} schools.` });
      queryClient.invalidateQueries({ queryKey: ["/api/schoolRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gis/overview"] });
      onComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message || "An error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const processedCount = results.filter((r) => r.status !== "pending" && r.status !== "processing").length;
  const successCount = results.filter((r) => r.status === "success").length;
  const toSaveCount = results.filter((r) => r.status === "success" && !r.isDiscarded).length;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (isProcessing || isSaving) return; onOpenChange(val); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-500" />
            Bulk Geocode Review
            {isProcessing && (
              <Badge variant="outline" className="ml-2 animate-pulse bg-indigo-50 text-indigo-700 border-indigo-200">
                Processing {processedCount} / {schoolsToProcess.length}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isProcessing
              ? "Fetching coordinates… Click ✏️ on any row to edit the search query if a result looks wrong."
              : `Found ${successCount} of ${schoolsToProcess.length}. Edit queries and re-geocode as needed, then Save.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-white relative">
            <div className="min-w-full divide-y divide-slate-100">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sticky top-0 z-10 shadow-sm">
                <div className="col-span-2">School Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-3">Search Query (editable)</div>
                <div className="col-span-3">Resolved Address / Municipality</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {results.map((result, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-12 gap-3 px-4 py-3 text-sm transition-colors ${result.isDiscarded ? "bg-slate-50/50 opacity-50" : "hover:bg-slate-50/80"
                    }`}
                >
                  {/* School name + status */}
                  <div className="col-span-2 flex items-start gap-2 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {result.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-slate-200" />}
                      {result.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />}
                      {result.status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {result.status === "failed" && <XCircle className="h-4 w-4 text-rose-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${result.isDiscarded ? "line-through text-slate-400" : "text-slate-900"}`}>
                        {result.name}
                      </p>
                      {studentOriginsMap?.has(result.schoolId) && (
                        <p className="text-[9px] text-primary/80 truncate mt-0.5" title={`Mostly from ${studentOriginsMap.get(result.schoolId)}`}>
                          From: {studentOriginsMap.get(result.schoolId)}
                        </p>
                      )}
                      {result.status === "failed" && (
                        <p className="text-[10px] text-rose-600 mt-0.5 flex items-center gap-0.5 truncate">
                          <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                          {result.errorReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Institution Type Dropdown */}
                  <div className="col-span-2 flex items-center min-w-0">
                    <Select
                      value={result.schoolType || "Unknown"}
                      onValueChange={(val) => {
                        setResults((cur) => {
                          const next = [...cur];
                          next[index] = { ...next[index], schoolType: val };
                          return next;
                        });
                      }}
                      disabled={result.isDiscarded}
                    >
                      <SelectTrigger className="h-7 text-[10px] w-full px-2">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Unknown", "Elementary", "High School", "Senior High School", "College", "University", "Vocational", "Special Education"].map(t => (
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search query — editable */}
                  <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                    {result.isEditingQuery ? (
                      <div className="flex w-full items-center gap-1">
                        <Input
                          autoFocus
                          className="h-7 text-xs flex-1"
                          value={result.editQueryDraft ?? ""}
                          onChange={(e) =>
                            setResults((cur) => {
                              const next = [...cur];
                              next[index] = { ...next[index], editQueryDraft: e.target.value };
                              return next;
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void confirmEditAndRetry(index);
                            if (e.key === "Escape") cancelEditQuery(index);
                          }}
                          placeholder="e.g. School Name, City, Philippines"
                        />
                        <Button size="icon" className="h-7 w-7 shrink-0 bg-indigo-600 hover:bg-indigo-700" onClick={() => void confirmEditAndRetry(index)}>
                          <RefreshCw className="h-3 w-3 text-white" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => cancelEditQuery(index)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex w-full items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 flex-1 truncate font-mono">{result.searchQuery}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-slate-400 hover:text-indigo-600"
                          onClick={() => startEditQuery(index)}
                          title="Edit search query and re-geocode"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        {(result.status === "failed" || result.status === "success") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-slate-400 hover:text-emerald-600"
                            onClick={() => void retryRow(index)}
                            title="Re-geocode with same query"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resolved address */}
                  <div className="col-span-3 flex flex-col justify-center">
                    {result.status === "success" ? (
                      <>
                        <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">{result.foundAddress}</p>
                        <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                          {result.municipality || "—"}{result.province ? `, ${result.province}` : ""}
                        </p>
                        <p className="font-mono text-[9px] text-slate-400 mt-0.5">
                          {result.lat?.toFixed(5)}, {result.lng?.toFixed(5)}
                        </p>
                        {result.duplicateOf && (
                          <Badge variant="outline" className="mt-1 max-w-fit border-amber-200 bg-amber-50 text-[9px] text-amber-700">
                            Possible duplicate of: {result.duplicateOf}
                          </Badge>
                        )}
                        {/* Location mismatch badges */}
                        {result.mismatchStatus === "name-mismatch" && (
                          <Badge variant="outline" className="mt-1 max-w-fit border-rose-200 bg-rose-50 text-[9px] text-rose-700 flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Name mismatch
                          </Badge>
                        )}
                        {result.mismatchStatus === "multi-campus" && (
                          <Badge variant="outline" className="mt-1 max-w-fit border-blue-200 bg-blue-50 text-[9px] text-blue-700">
                            Multi-campus — verify branch
                          </Badge>
                        )}
                        {result.mismatchStatus === "retried" && (
                          <Badge variant="outline" className="mt-1 max-w-fit border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700">
                            ✓ Auto-located via student demographics
                          </Badge>
                        )}
                        {result.mismatchStatus === "manually-edited" && (
                          <Badge variant="outline" className="mt-1 max-w-fit border-purple-200 bg-purple-50 text-[9px] text-purple-700">
                            ✏️ Manually edited
                          </Badge>
                        )}
                        {result.mismatchMessage && result.mismatchStatus !== "ok" && (
                          <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2" title={result.mismatchMessage}>
                            {result.mismatchMessage}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-end items-center gap-1">
                    {onEditSchool && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => {
                          const originalSchool = schoolsToProcess.find(s => s.id === result.schoolId);
                          if (originalSchool) onEditSchool(originalSchool);
                        }}
                        title="Edit School Details"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {result.status === "success" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${result.isDiscarded ? "text-emerald-600 hover:bg-emerald-50" : "text-rose-500 hover:bg-rose-50"}`}
                        onClick={() => toggleDiscard(index)}
                        title={result.isDiscarded ? "Include in save" : "Discard this result"}
                      >
                        {result.isDiscarded ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-sm text-slate-500">
            {!isProcessing && (
              <span>
                {successCount} found · {toSaveCount} selected to save
                {results.filter((r) => r.status === "failed").length > 0 && (
                  <span className="ml-2 text-rose-500">
                    · {results.filter((r) => r.status === "failed").length} failed (edit query to retry)
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing || isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing || isSaving || toSaveCount === 0}
              className="min-w-[130px] bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : `Save ${toSaveCount} Schools`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
