import { useState, useMemo } from "react";
import { Edit, Plus, RefreshCw, Trash2, MapPin, Upload, Download, Merge, Filter } from "lucide-react";
import type { SchoolRegistry as School } from "@shared/schema";
import { api } from "@shared/routes";
import { getSchoolStatus, hasCoordinates } from "@shared/schoolRegistry";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UnmatchedSchoolsQueue } from "./UnmatchedSchoolsQueue";
import { RegistryGeocodeReviewModal } from "./RegistryGeocodeReviewModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminSchoolRegistryProps {
  compact?: boolean;
  duplicateIds: Set<number>;
  filteredSchools: School[];
  isLoading: boolean;
  registrySearch: string;
  showAcronymsOnly?: boolean;
  onAcronymsToggle?: (val: boolean) => void;
  onAdd: () => void;
  onDelete: (school: School) => void;
  onEdit: (school: School) => void;
  onGeolocate: (school: School) => void;
  onRemoveDuplicate: (school: School) => void;
  onSearchChange: (value: string) => void;
  onBulkMergeOpen?: () => void;
  studentOriginsMap?: Map<number, string>;
}

export function AdminSchoolRegistry({
  compact = false,
  duplicateIds,
  filteredSchools,
  isLoading,
  registrySearch,
  showAcronymsOnly,
  onAcronymsToggle,
  onAdd,
  onDelete,
  onEdit,
  onGeolocate,
  onRemoveDuplicate,
  onSearchChange,
  onBulkMergeOpen,
  studentOriginsMap,
}: AdminSchoolRegistryProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [schoolsToReview, setSchoolsToReview] = useState<School[]>([]);
  
  const [registryPage, setRegistryPage] = useState(1);
  const [registryStatusFilter, setRegistryStatusFilter] = useState("All");
  const [registryMunicipalityFilter, setRegistryMunicipalityFilter] = useState("All");
  const [registryTypeFilter, setRegistryTypeFilter] = useState("All");
  const [registrySort, setRegistrySort] = useState("Newest");

  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/directory/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: "Import Successful", description: data.message });
        void queryClient.invalidateQueries({ queryKey: [api.schoolRegistry.list.path] });
      } else {
        toast({ title: "Import Failed", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Upload Error", description: "An error occurred while uploading.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleExportJson = () => {
    const jsonString = JSON.stringify(filteredSchools, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schools_directory.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await apiRequest(api.schoolRegistry.batchDelete.method, api.schoolRegistry.batchDelete.path, {
        ids: Array.from(selectedIds),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: data.message });
        setSelectedIds(new Set());
        void queryClient.invalidateQueries({ queryKey: [api.gis.overview.path] });
        void queryClient.invalidateQueries({ queryKey: [api.schoolRegistry.list.path] });
        void queryClient.invalidateQueries({ queryKey: [api.mapping.queue.path] });
      } else {
        toast({ title: "Delete Error", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Delete Failed", description: String(e), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkGeolocate = () => {
    if (selectedIds.size === 0) return;
    const selected = filteredSchools.filter(s => selectedIds.has(s.id));
    setSchoolsToReview(selected);
    setIsReviewModalOpen(true);
  };

  const municipalityOptions = useMemo(() => {
    const set = new Set(filteredSchools.map(s => s.municipality?.trim()).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [filteredSchools]);

  const typeOptions = useMemo(() => {
    const set = new Set(filteredSchools.map(s => s.schoolType?.trim()).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [filteredSchools]);

  const processedSchools = useMemo(() => {
    return filteredSchools
      .filter((school) => {
        // Status filter
        if (registryStatusFilter !== "All") {
          const status = duplicateIds.has(school.id) ? "Duplicate Entry" : getSchoolStatus(school);
          if (registryStatusFilter === "Verified" && !(school.isActive && hasCoordinates(school))) return false;
          if (registryStatusFilter !== "Verified" && status !== registryStatusFilter) return false;
        }
        // Municipality filter
        if (registryMunicipalityFilter !== "All") {
          if ((school.municipality?.trim() || "") !== registryMunicipalityFilter) return false;
        }
        // School type filter
        if (registryTypeFilter !== "All") {
          if ((school.schoolType?.trim() || "") !== registryTypeFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (registrySort === "School Name (A-Z)") return a.schoolName.localeCompare(b.schoolName);
        if (registrySort === "School Name (Z-A)") return b.schoolName.localeCompare(a.schoolName);
        if (registrySort === "Missing Coordinates First") {
          const aMiss = !hasCoordinates(a);
          const bMiss = !hasCoordinates(b);
          if (aMiss && !bMiss) return -1;
          if (!aMiss && bMiss) return 1;
        }
        return b.id - a.id;
      });
  }, [filteredSchools, duplicateIds, registryStatusFilter, registryMunicipalityFilter, registryTypeFilter, registrySort]);

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(processedSchools.length / pageSize));
  const currentPage = Math.min(registryPage, totalPages);
  const pageRows = processedSchools.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const { data: importProgress } = useQuery<any>({
    queryKey: ["/api/imports/progress"],
    refetchInterval: (query) => query.state.data?.isProcessing ? 1000 : 3000,
  });

  const { data: stagingRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/imports/staging"],
    refetchInterval: (query) => importProgress?.isProcessing ? 2000 : false,
  });

  const unmatchedNames = Array.from(new Set(
    stagingRecords
      .filter((r: any) => r.importStatus === "Unmatched")
      .map((r: any) => r.previousSchool)
      .filter(Boolean)
  )) as string[];

  const unmatchedSchoolsData = useMemo(() => {
    const map = new Map<string, string>();
    stagingRecords
      .filter((r: any) => r.importStatus === "Unmatched" && r.previousSchool)
      .forEach((r: any) => {
        if (!map.has(r.previousSchool)) {
          map.set(r.previousSchool, r.municipality || "Laguna");
        }
      });
    return Array.from(map.entries()).map(([name, municipality]) => ({ name, municipality }));
  }, [stagingRecords]);

  const resolveMatchMutation = useMutation({
    mutationFn: async (payload: { importedName: string; officialSchoolId: number; createAlias: boolean }) => {
      const res = await fetch("/api/imports/match-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to resolve match");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports/staging"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/diagnostics"] });
    },
  });

  return (
    <div className={cn("mx-auto space-y-3", compact ? "max-w-full" : "max-w-7xl space-y-4")}>
      <Tabs defaultValue="masterlist" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className={cn("font-semibold text-slate-900", compact ? "text-sm" : "text-xl font-black")}>School registry</h3>
            <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-sm")}>
              Manage official schools and process pending imports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TabsList className="bg-slate-100/80">
              <TabsTrigger value="masterlist" className="text-xs">Official Masterlist</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs relative">
                Pending Imports
                {unmatchedNames.length > 0 && (
                  <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {unmatchedNames.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <Button 
              variant="outline" 
              className={cn("gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800", compact ? "h-9 px-3 text-xs" : "h-10")} 
              onClick={onBulkMergeOpen}
              disabled={duplicateIds.size === 0}
            >
              <Merge className="h-3.5 w-3.5" />
              Auto-Merge Duplicates {duplicateIds.size > 0 && `(${duplicateIds.size})`}
            </Button>
            <Button className={cn("gap-2", compact ? "h-9 px-3 text-xs" : "h-10")} onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" />
              Add school
            </Button>
          </div>
        </div>

        <TabsContent value="masterlist" className="m-0 space-y-3">
          <TableToolbar
            searchQuery={registrySearch}
            onSearchChange={onSearchChange}
            searchPlaceholder="Search schools, municipalities, type, or status..."
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            onDelete={handleBulkDelete}
            isDeleting={isDeleting}
            deleteItemName="schools"
          />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className={cn("font-semibold text-slate-900", compact ? "text-sm" : "text-xl font-black")}>School registry</h3>
          <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-sm")}>
            One GIS entity per school - coordinates, municipality, verification.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportJson} className="gap-2 shadow-sm h-9">
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
          
          <div className="relative">
            <Input 
              type="file" 
              accept=".xlsx,.xls" 
              onChange={handleFileUpload} 
              disabled={isUploading}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Button size="sm" className="gap-2 shadow-sm h-9" disabled={isUploading}>
              <Upload className="w-4 h-4" />
              {isUploading ? "Importing..." : "Import Updated Excel"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-slate-50/80 p-2">
        <div className="flex flex-wrap items-center gap-2">
          {onAcronymsToggle && (
            <Button 
              variant={showAcronymsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onAcronymsToggle(!showAcronymsOnly);
                if (!showAcronymsOnly) {
                  onSearchChange("");
                }
              }}
              className="h-8 text-xs bg-white text-slate-700 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground shadow-sm px-3"
              data-state={showAcronymsOnly ? "on" : "off"}
            >
              <Filter className="w-3 h-3 mr-2" />
              Acronyms Only
            </Button>
          )}

          {/* Status */}
          <Select value={registryStatusFilter} onValueChange={(v) => { setRegistryStatusFilter(v); setRegistryPage(1); }}>
            <SelectTrigger className="h-8 w-[175px] text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Verified">✅ Verified</SelectItem>
              <SelectItem value="Missing Coordinates">⚠️ Missing Coordinates</SelectItem>
              <SelectItem value="Auto-Located">🔍 Auto-Located</SelectItem>
              <SelectItem value="Needs Review">🔄 Needs Review</SelectItem>
              <SelectItem value="Duplicate Entry">🗂 Duplicate Entry</SelectItem>
            </SelectContent>
          </Select>

          {/* Municipality */}
          <Select value={registryMunicipalityFilter} onValueChange={(v) => { setRegistryMunicipalityFilter(v); setRegistryPage(1); }}>
            <SelectTrigger className="h-8 w-[175px] text-xs">
              <SelectValue placeholder="All Municipalities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Municipalities</SelectItem>
              {municipalityOptions.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* School Type */}
          <Select value={registryTypeFilter} onValueChange={(v) => { setRegistryTypeFilter(v); setRegistryPage(1); }}>
            <SelectTrigger className="h-8 w-[175px] text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              {typeOptions.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={registrySort} onValueChange={(v) => { setRegistrySort(v); setRegistryPage(1); }}>
            <SelectTrigger className="h-8 w-[185px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Newest">Newest First</SelectItem>
              <SelectItem value="School Name (A-Z)">School Name (A-Z)</SelectItem>
              <SelectItem value="School Name (Z-A)">School Name (Z-A)</SelectItem>
              <SelectItem value="Missing Coordinates First">Missing Coordinates First</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset filters */}
          {(registryStatusFilter !== "All" || registryMunicipalityFilter !== "All" || registryTypeFilter !== "All") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
              onClick={() => {
                setRegistryStatusFilter("All");
                setRegistryMunicipalityFilter("All");
                setRegistryTypeFilter("All");
                setRegistryPage(1);
              }}
            >
              ✕ Clear Filters
            </Button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-2 self-end border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
            onClick={handleBulkGeolocate}
          >
            <MapPin className="h-3.5 w-3.5" />
            Geocode Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      <Card className="overflow-hidden rounded-lg border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <Table className={cn(compact ? "min-w-[960px] text-xs" : "min-w-[800px]")}>
            <TableHeader>
              <TableRow className={cn(compact && "hover:bg-transparent")}>
                <TableHead className="w-10 px-4">
                  <Checkbox
                    checked={pageRows.length > 0 && pageRows.every((s) => selectedIds.has(s.id))}
                    onCheckedChange={(checked) => {
                      const next = new Set(selectedIds);
                      if (checked) {
                        pageRows.forEach(s => next.add(s.id));
                      } else {
                        pageRows.forEach(s => next.delete(s.id));
                      }
                      setSelectedIds(next);
                    }}
                    aria-label="Select all schools on page"
                  />
                </TableHead>
                {compact ? (
                  <>
                    <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">School</TableHead>
                    <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Normalized</TableHead>
                    <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Lat / Lng</TableHead>
                    <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Municipality</TableHead>
                    <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Province</TableHead>
                    <TableHead className="whitespace-nowrap text-right text-[10px] font-semibold uppercase tracking-wide">Students</TableHead>
                    <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Frosh / Xfer</TableHead>
                    <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide">Verification</TableHead>
                    <TableHead className="whitespace-nowrap text-right text-[10px] font-semibold uppercase tracking-wide">Actions</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>School</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Municipality</TableHead>
                    <TableHead>School Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={compact ? 10 : 7} className="h-24 text-center text-muted-foreground">Loading registry...</TableCell></TableRow>
              ) : pageRows.length === 0 ? (
                <TableRow><TableCell colSpan={compact ? 10 : 7} className="h-24 text-center text-muted-foreground">No schools found.</TableCell></TableRow>
              ) : pageRows.map((school) => {
                const registryStatus = duplicateIds.has(school.id) ? "Duplicate Entry" : getSchoolStatus(school);
                const actionBtn = compact ? "h-7 w-7" : "h-8 w-8";
                const actionIcon = compact ? "h-3.5 w-3.5" : "h-4 w-4";

                return (
                  <TableRow key={school.id} className={cn(compact && "text-[11px]")} data-state={selectedIds.has(school.id) ? "selected" : undefined}>
                    <TableCell className="px-4">
                      <Checkbox
                        checked={selectedIds.has(school.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedIds);
                          if (checked) next.add(school.id);
                          else next.delete(school.id);
                          setSelectedIds(next);
                        }}
                        aria-label={`Select school ${school.schoolName}`}
                      />
                    </TableCell>
                    <TableCell className={cn(compact && "max-w-[180px]")}>
                      <p className={cn("font-semibold", compact && "truncate")}>{school.schoolName}</p>
                      {!compact ? (
                        <p className="text-xs text-muted-foreground">{school.schoolType || "Unknown"}</p>
                      ) : (
                        <p className="truncate text-[10px] text-muted-foreground">{school.schoolType}</p>
                      )}
                    </TableCell>
                    {compact ? (
                      <>
                        <TableCell className="max-w-[140px]">
                          <span className="block truncate font-mono text-[10px] text-slate-600">
                            {school.normalizedSchoolName || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {hasCoordinates(school) ? (
                            <span className="font-mono text-[10px]">{school.latitude!.toFixed(5)}, {school.longitude!.toFixed(5)}</span>
                          ) : (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">Missing</Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{school.municipality}</TableCell>
                        <TableCell className="whitespace-nowrap text-slate-500">{school.province || "Laguna"}</TableCell>
                        <TableCell className="text-right tabular-nums">-</TableCell>
                        <TableCell className="whitespace-nowrap text-slate-400">- / -</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]", statusTone(school, duplicateIds))}>
                            {school.isActive ? "Verified" : registryStatus}
                          </Badge>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          {hasCoordinates(school) ? (
                            <span className="font-mono text-xs">{school.latitude!.toFixed(5)}, {school.longitude!.toFixed(5)}</span>
                          ) : (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Missing</Badge>
                          )}
                        </TableCell>
                        <TableCell>{school.municipality}</TableCell>
                        <TableCell>{school.schoolType}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusTone(school, duplicateIds)}>{registryStatus}</Badge>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className={actionBtn} onClick={() => onEdit(school)} title="Edit school">
                          <Edit className={actionIcon} />
                        </Button>
                        <Button variant="ghost" size="icon" className={actionBtn} onClick={() => onGeolocate(school)} title="Re-geolocate school">
                          <RefreshCw className={actionIcon} />
                        </Button>
                        {duplicateIds.has(school.id) && (
                          <Button variant="ghost" size="icon" className={cn(actionBtn, "text-amber-700")} onClick={() => onRemoveDuplicate(school)} title="Remove duplicate">
                            <Trash2 className={actionIcon} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className={cn(actionBtn, "text-rose-600")} onClick={() => onDelete(school)} title="Delete school">
                          <Trash2 className={actionIcon} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>{processedSchools.length.toLocaleString()} schools · {selectedIds.size.toLocaleString()} selected</span>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={currentPage <= 1} onClick={() => setRegistryPage((page) => Math.max(1, page - 1))}>Previous</Button>
            <span className="min-w-[92px] text-center">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={currentPage >= totalPages} onClick={() => setRegistryPage((page) => Math.min(totalPages, page + 1))}>Next</Button>
          </div>
        </div>
      </Card>
      </TabsContent>

      <TabsContent value="pending" className="m-0">
        <UnmatchedSchoolsQueue 
          unmatchedSchoolNames={unmatchedNames}
          unmatchedSchoolsData={unmatchedSchoolsData}
          manualMatches={{}} // handled internally if needed, or we can just pass {}
          existingSchools={filteredSchools}
          onResolveMatch={(importedName, school) => {
            if (school) {
              resolveMatchMutation.mutate({ importedName, officialSchoolId: school.id, createAlias: true });
            }
          }}
        />
      </TabsContent>
      </Tabs>
      
      <RegistryGeocodeReviewModal
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        schoolsToProcess={schoolsToReview}
        onComplete={() => setSelectedIds(new Set())}
        studentOriginsMap={studentOriginsMap}
        onEditSchool={onEdit}
      />
    </div>
  );
}

function statusTone(school: School, duplicateIds: Set<number>) {
  const status = duplicateIds.has(school.id) ? "Duplicate Entry" : getSchoolStatus(school);
  if (status === "Verified") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Auto-Located") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "Duplicate Entry") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "Missing Coordinates") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}
