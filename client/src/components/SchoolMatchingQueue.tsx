import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { SchoolRegistry as School } from "@shared/schema";
import { api } from "@shared/routes";
import { hasCoordinates } from "@shared/schoolRegistry";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableToolbar } from "@/components/ui/table-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SchoolMatchingQueueProps {
  duplicateIds: Set<number>;
  onAddSchool: () => void;
  onEditSchool: (school: School) => void;
  onGeolocateSchool: (school: School) => void;
  onRemoveDuplicate: (school: School) => void;
  queueSearch: string;
  queueSelected: Set<number>;
  queueSchools: School[];
  setQueueSearch: (value: string) => void;
  setQueueSelected: (value: Set<number>) => void;
}

export function SchoolMatchingQueue({
  duplicateIds,
  onAddSchool,
  onEditSchool,
  onGeolocateSchool,
  onRemoveDuplicate,
  queueSearch,
  queueSelected,
  queueSchools,
  setQueueSearch,
  setQueueSelected,
}: SchoolMatchingQueueProps) {
  const [isDeletingQueue, setIsDeletingQueue] = useState(false);
  const { toast } = useToast();

  const queueSchoolsFiltered = useMemo(() => {
    let list = [...queueSchools];
    if (queueSearch) {
      const q = queueSearch.toLowerCase();
      list = list.filter((s) =>
        s.schoolName.toLowerCase().includes(q) ||
        (s.municipality && s.municipality.toLowerCase().includes(q)) ||
        (s.province && s.province.toLowerCase().includes(q)) ||
        ((s.isActive ? "verified" : "unverified").includes(q))
      );
    }
    return list.sort((a, b) => a.schoolName.localeCompare(b.schoolName));
  }, [queueSchools, queueSearch]);

  const deleteQueue = async () => {
    try {
      setIsDeletingQueue(true);
      const res = await apiRequest(api.schoolRegistry.batchDelete.method, api.schoolRegistry.batchDelete.path, {
        ids: Array.from(queueSelected),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: data.message });
        setQueueSelected(new Set());
        void queryClient.invalidateQueries({ queryKey: [api.gis.overview.path] });
        void queryClient.invalidateQueries({ queryKey: [api.schoolRegistry.list.path] });
        void queryClient.invalidateQueries({ queryKey: [api.mapping.queue.path] });
      } else {
        toast({ title: "Delete Error", description: data.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Delete Failed", description: String(e), variant: "destructive" });
    } finally {
      setIsDeletingQueue(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl space-y-3 p-3 sm:p-4">
        <TableToolbar
          searchQuery={queueSearch}
          onSearchChange={setQueueSearch}
          searchPlaceholder="Search queue..."
          selectedCount={queueSelected.size}
          onClearSelection={() => setQueueSelected(new Set())}
          onDelete={deleteQueue}
          isDeleting={isDeletingQueue}
          deleteItemName="schools"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            Unknown schools, low-confidence matches, and missing coordinates. Verify, pin, approve, or merge.
          </p>
          <Button size="sm" className="h-8 text-xs" onClick={onAddSchool}>
            Add school
          </Button>
        </div>
        {queueSchoolsFiltered.length === 0 ? (
          <Card className="border-white/70 bg-white/70 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
              <p className="text-sm font-medium text-slate-700">Queue is clear</p>
              <p className="text-xs text-slate-500">No schools need review or coordinates.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-white/70 bg-white/70 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-4">
                    <Checkbox
                      checked={queueSchoolsFiltered.length > 0 && queueSelected.size === queueSchoolsFiltered.length}
                      onCheckedChange={(checked) => setQueueSelected(checked ? new Set(queueSchoolsFiltered.map((s) => s.id)) : new Set())}
                      aria-label="Select all schools"
                    />
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase">School</TableHead>
                  <TableHead className="hidden text-[10px] font-semibold uppercase sm:table-cell">Issue</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueSchoolsFiltered.map((s) => (
                  <TableRow key={s.id} className="text-xs" data-state={queueSelected.has(s.id) ? "selected" : undefined}>
                    <TableCell className="px-4">
                      <Checkbox
                        checked={queueSelected.has(s.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(queueSelected);
                          if (checked) next.add(s.id);
                          else next.delete(s.id);
                          setQueueSelected(next);
                        }}
                        aria-label={`Select school ${s.schoolName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{s.schoolName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.municipality} - {s.schoolType}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {!hasCoordinates(s) ? (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-900">
                            No coordinates
                          </Badge>
                        ) : null}
                        {duplicateIds.has(s.id) ? (
                          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[10px] text-rose-800">
                            Duplicate
                          </Badge>
                        ) : null}
                        {!s.isActive ? (
                          <Badge variant="outline" className="text-[10px]">
                            Needs review
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="secondary" size="sm" className="h-7 px-2 text-[11px]" onClick={() => onEditSchool(s)}>
                          Verify
                        </Button>
                        {!hasCoordinates(s) ? (
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => onGeolocateSchool(s)}>
                            Pin
                          </Button>
                        ) : null}
                        {duplicateIds.has(s.id) ? (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-amber-700" onClick={() => onRemoveDuplicate(s)}>
                            Merge
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
