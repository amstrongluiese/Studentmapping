import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SchoolRegistry } from "@shared/schema";
import { normalizeSchoolName, hasCoordinates } from "@shared/schoolRegistry";
import { useBulkMergeSchools } from "@/hooks/use-schools";
import { Loader2, Merge, MapPin, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MergePair {
  duplicate: SchoolRegistry;
  target: SchoolRegistry;
}

export function BulkMergeReviewModal({
  open,
  onOpenChange,
  schools,
  duplicateIds,
  studentOriginsMap,
  onGeolocate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schools: SchoolRegistry[];
  duplicateIds: Set<number>;
  studentOriginsMap?: Map<number, string>;
  onGeolocate: (school: SchoolRegistry) => Promise<void> | void;
}) {
  const [step, setStep] = useState<"review" | "merging" | "geolocating" | "done">("review");
  const [progress, setProgress] = useState(0);
  const bulkMerge = useBulkMergeSchools();
  const [successfulMasters, setSuccessfulMasters] = useState<SchoolRegistry[]>([]);

  // Compute all merge pairs based on the duplicate logic
  const mergePairs = useMemo(() => {
    if (!open) return [];
    
    const pairs: MergePair[] = [];
    const nameMap = new Map<string, SchoolRegistry[]>();
    
    // Group schools by normalized name
    schools.forEach(school => {
      const key = normalizeSchoolName(school.normalizedSchoolName || school.schoolName);
      nameMap.set(key, [...(nameMap.get(key) || []), school]);
    });

    nameMap.forEach(group => {
      if (group.length > 1) {
        // Sort to find the best master (has coordinates)
        const sorted = [...group].sort((a, b) => {
          if (hasCoordinates(a) && !hasCoordinates(b)) return -1;
          if (!hasCoordinates(a) && hasCoordinates(b)) return 1;
          return 0;
        });

        const target = sorted[0];
        const duplicates = sorted.slice(1);
        
        duplicates.forEach(duplicate => {
          if (duplicateIds.has(duplicate.id)) {
            pairs.push({ duplicate, target });
          }
        });
      }
    });

    return pairs;
  }, [schools, duplicateIds, open]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("review");
        setProgress(0);
        setSuccessfulMasters([]);
      }, 300);
    }
  }, [open]);

  const handleMerge = async () => {
    setStep("merging");
    setProgress(20);
    
    try {
      const payload = mergePairs.map(p => ({
        duplicateId: p.duplicate.id,
        targetId: p.target.id
      }));
      
      await bulkMerge.mutateAsync({ pairs: payload });
      setProgress(100);
      
      // Collect unique masters for geolocation
      const uniqueMasterIds = new Set<number>();
      const masters: SchoolRegistry[] = [];
      mergePairs.forEach(p => {
        if (!uniqueMasterIds.has(p.target.id)) {
          uniqueMasterIds.add(p.target.id);
          masters.push(p.target);
        }
      });
      
      setSuccessfulMasters(masters);
      
      setTimeout(() => {
        setStep("geolocating");
        setProgress(0);
        handleGeolocateAll(masters);
      }, 1000);
      
    } catch (error) {
      console.error(error);
      setStep("review"); // revert on error
    }
  };

  const handleGeolocateAll = async (masters: SchoolRegistry[]) => {
    if (masters.length === 0) {
      setStep("done");
      return;
    }

    for (let i = 0; i < masters.length; i++) {
      try {
        await onGeolocate(masters[i]);
      } catch (err) {
        console.error(`Failed to geolocate master ${masters[i].id}:`, err);
      }
      setProgress(Math.round(((i + 1) / masters.length) * 100));
      // Small delay to prevent API rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setTimeout(() => {
      setStep("done");
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent closing while working
      if ((step === "merging" || step === "geolocating") && !val) return;
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-xl">
        {step === "review" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Merge className="h-5 w-5 text-amber-600" />
                Review Bulk Merge
              </DialogTitle>
              <DialogDescription>
                We found <strong>{mergePairs.length}</strong> duplicate records. The system will automatically merge them into their respective master records (prioritizing records with coordinates).
              </DialogDescription>
            </DialogHeader>

            {mergePairs.length > 0 ? (
              <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-slate-50">
                <div className="space-y-4">
                  {mergePairs.map((pair, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-md border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          {pair.duplicate.schoolName}
                        </div>
                        <div className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Duplicate
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Original Record</span>
                          <span className="text-slate-700">{pair.target.schoolName}</span>
                          {studentOriginsMap?.has(pair.target.id) && (
                            <div className="text-[10px] text-primary mt-1">Populated by students mostly from {studentOriginsMap.get(pair.target.id)}</div>
                          )}
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Will Be Deleted</span>
                          <span className="text-amber-700">{pair.duplicate.schoolName}</span>
                          {studentOriginsMap?.has(pair.duplicate.id) && (
                            <div className="text-[10px] text-amber-600 mt-1">Populated by students mostly from {studentOriginsMap.get(pair.duplicate.id)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-500 flex-col gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p>No duplicates found to merge.</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button 
                onClick={handleMerge} 
                disabled={mergePairs.length === 0 || bulkMerge.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {bulkMerge.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Merge className="h-4 w-4 mr-2" />}
                Merge & Geolocate All
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "merging" && (
          <div className="py-12 flex flex-col items-center justify-center space-y-6">
            <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Merging Records...</h3>
              <p className="text-sm text-slate-500">Combining {mergePairs.length} duplicate pairs and reassigning references.</p>
            </div>
            <Progress value={progress} className="w-[80%]" />
          </div>
        )}

        {step === "geolocating" && (
          <div className="py-12 flex flex-col items-center justify-center space-y-6">
            <MapPin className="h-12 w-12 animate-bounce text-blue-500" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Geolocating Master Records...</h3>
              <p className="text-sm text-slate-500">Fetching missing addresses for {successfulMasters.length} merged records.</p>
            </div>
            <Progress value={progress} className="w-[80%]" />
          </div>
        )}

        {step === "done" && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-xl">Success!</h3>
              <p className="text-sm text-slate-500 text-balance">
                Successfully merged {mergePairs.length} records and updated their geolocations.
              </p>
            </div>
            <Button className="mt-4" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
