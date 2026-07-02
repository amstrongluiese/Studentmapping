import { useState } from "react";
import { Edit, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { SchoolRegistry as School } from "@shared/schema";
import { api } from "@shared/routes";
import { getSchoolStatus, hasCoordinates } from "@shared/schoolRegistry";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TableToolbar } from "@/components/ui/table-toolbar";
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
  onAdd: () => void;
  onDelete: (school: School) => void;
  onEdit: (school: School) => void;
  onGeolocate: (school: School) => void;
  onRemoveDuplicate: (school: School) => void;
  onSearchChange: (value: string) => void;
}

export function AdminSchoolRegistry({
  compact = false,
  duplicateIds,
  filteredSchools,
  isLoading,
  registrySearch,
  onAdd,
  onDelete,
  onEdit,
  onGeolocate,
  onRemoveDuplicate,
  onSearchChange,
}: AdminSchoolRegistryProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

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

  return (
    <div className={cn("mx-auto space-y-3", compact ? "max-w-full" : "max-w-7xl space-y-4")}>
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
        <Button className={cn("gap-2", compact ? "h-8 px-3 text-xs" : "h-10")} onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add school
        </Button>
      </div>

      <Card className="overflow-hidden rounded-lg border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <Table className={cn(compact ? "min-w-[960px] text-xs" : "min-w-[800px]")}>
            <TableHeader>
              <TableRow className={cn(compact && "hover:bg-transparent")}>
                <TableHead className="w-10 px-4">
                  <Checkbox
                    checked={filteredSchools.length > 0 && selectedIds.size === filteredSchools.length}
                    onCheckedChange={(checked) => setSelectedIds(checked ? new Set(filteredSchools.map((s) => s.id)) : new Set())}
                    aria-label="Select all schools"
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
              ) : filteredSchools.length === 0 ? (
                <TableRow><TableCell colSpan={compact ? 10 : 7} className="h-24 text-center text-muted-foreground">No schools found.</TableCell></TableRow>
              ) : filteredSchools.map((school) => {
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
      </Card>
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
