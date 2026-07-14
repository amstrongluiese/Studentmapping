import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, MapPin, AlertCircle, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { SchoolRegistry as School } from "@shared/schema";

interface RegistryGeocodeReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolsToProcess: School[];
  onComplete: () => void;
}

interface GeocodeResult {
  schoolId: number;
  name: string;
  status: "pending" | "success" | "failed";
  foundAddress?: string;
  lat?: number;
  lng?: number;
  errorReason?: string;
  isDiscarded?: boolean;
}

export function RegistryGeocodeReviewModal({
  open,
  onOpenChange,
  schoolsToProcess,
  onComplete,
}: RegistryGeocodeReviewModalProps) {
  const { toast } = useToast();
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (open && schoolsToProcess.length > 0 && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startBatchGeocode();
    }
    
    if (!open) {
      hasStartedRef.current = false;
      setResults([]);
    }
  }, [open, schoolsToProcess]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const startBatchGeocode = async () => {
    setIsProcessing(true);
    
    const initialResults: GeocodeResult[] = schoolsToProcess.map(s => ({
      schoolId: s.id,
      name: s.schoolName,
      status: "pending"
    }));
    setResults([...initialResults]);

    const { requestGeocodeSchoolOrThrow } = await import("@/lib/geocodeSchoolApi");

    for (let i = 0; i < schoolsToProcess.length; i++) {
      const school = schoolsToProcess[i];
      
      try {
        const municipality = school.municipality?.trim() || undefined;
        const result = await requestGeocodeSchoolOrThrow({
          schoolName: school.schoolName,
          municipality,
        });

        setResults(current => {
          const newResults = [...current];
          newResults[i] = {
            ...newResults[i],
            status: "success",
            lat: result.latitude,
            lng: result.longitude,
            foundAddress: result.displayName
          };
          return newResults;
        });
      } catch (err: any) {
        setResults(current => {
          const newResults = [...current];
          newResults[i] = {
            ...newResults[i],
            status: "failed",
            errorReason: err.message || "Failed to find coordinates"
          };
          return newResults;
        });
      }
      
      // Delay between backend requests to avoid ratelimits
      await delay(800);
    }
    
    setIsProcessing(false);
  };

  const handleSave = async () => {
    const toSave = results.filter(r => r.status === "success" && !r.isDiscarded && r.lat && r.lng);
    
    if (toSave.length === 0) {
      toast({
        title: "Nothing to save",
        description: "No successfully geocoded schools selected."
      });
      return;
    }

    setIsSaving(true);
    try {
      const promises = toSave.map(r => 
        apiRequest("PATCH", `/api/schoolRegistry/${r.schoolId}`, {
          latitude: r.lat,
          longitude: r.lng,
          isActive: true,
          source: "Bulk Geocoding Manual Assist"
        })
      );
      
      await Promise.all(promises);
      
      toast({
        title: "Updates Saved",
        description: `Successfully updated ${toSave.length} schools.`
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/schoolRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gis/overview"] });
      onComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "An error occurred while saving.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDiscard = (index: number) => {
    setResults(current => {
      const newResults = [...current];
      newResults[index] = {
        ...newResults[index],
        isDiscarded: !newResults[index].isDiscarded
      };
      return newResults;
    });
  };

  const processedCount = results.filter(r => r.status !== "pending").length;
  const successCount = results.filter(r => r.status === "success").length;
  const toSaveCount = results.filter(r => r.status === "success" && !r.isDiscarded).length;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (isProcessing || isSaving) return;
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
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
              ? "Fetching coordinates for the selected schools. Please wait..."
              : `Found coordinates for ${successCount} out of ${schoolsToProcess.length} schools. Review the results below before saving.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-0 relative">
          <ScrollArea className="h-full max-h-[50vh]">
            <div className="min-w-full divide-y divide-slate-100">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/80 text-xs font-semibold text-slate-500 sticky top-0 z-10 shadow-sm">
                <div className="col-span-4">School Name</div>
                <div className="col-span-5">Resolved Address</div>
                <div className="col-span-2">Coordinates</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {results.map((result, index) => (
                <div 
                  key={index} 
                  className={`grid grid-cols-12 gap-4 px-6 py-4 text-sm transition-colors ${
                    result.isDiscarded ? "bg-slate-50/50 opacity-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="col-span-4 flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {result.status === "pending" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                      {result.status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {result.status === "failed" && <XCircle className="h-4 w-4 text-rose-500" />}
                    </div>
                    <div>
                      <p className={`font-medium ${result.isDiscarded ? "line-through text-slate-500" : "text-slate-900"}`}>
                        {result.name}
                      </p>
                      {result.status === "failed" && (
                        <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {result.errorReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="col-span-5">
                    {result.status === "success" ? (
                      <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                        {result.foundAddress}
                      </p>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </div>

                  <div className="col-span-2">
                    {result.status === "success" ? (
                      <div className="font-mono text-xs text-slate-500 space-y-1">
                        <div>{result.lat?.toFixed(5)}</div>
                        <div>{result.lng?.toFixed(5)}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </div>

                  <div className="col-span-1 flex justify-end">
                    {result.status === "success" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${result.isDiscarded ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-rose-500 hover:text-rose-600 hover:bg-rose-50"}`}
                        onClick={() => toggleDiscard(index)}
                        title={result.isDiscarded ? "Include in save" : "Discard this result"}
                      >
                        {result.isDiscarded ? <CheckCircle2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-sm text-slate-500">
            {!isProcessing && successCount > 0 && (
              <span>Ready to save <strong className="text-slate-900">{toSaveCount}</strong> verified locations.</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isProcessing || isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isProcessing || isSaving || toSaveCount === 0}
              className="min-w-[120px] bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                "Save Updates"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
