import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportRow {
  name: string;
  municipality: string;
  institutionType: string;
  lat: number | null;
  lng: number | null;
  studentCount: number;
  status: "pending" | "geocoding" | "located" | "verified" | "error";
  statusMessage?: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeSchool(name: string, municipality: string): Promise<{ lat: number; lng: number } | null> {
  const query = `${name}, ${municipality}, Laguna, Philippines`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "User-Agent": "TrimexStudentMapping/1.0 (admissions@trimex.edu.ph)" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

function parseFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let rows: any[] = [];

        if (file.name.endsWith(".json")) {
          rows = JSON.parse(data as string);
        } else if (file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const workbook = XLSX.read(data, { type: file.name.endsWith(".csv") ? "string" : "binary" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        }

        const parsed: ImportRow[] = rows
          .filter((r: any) => r["School Name"] || r["school_name"] || r["name"])
          .map((r: any) => {
            const name = String(r["School Name"] || r["school_name"] || r["name"] || "").trim();
            const municipality = String(r["Municipality"] || r["municipality"] || "").trim();
            const institutionType = String(r["Institution Type"] || r["institution_type"] || r["institutionType"] || "").trim();
            const lat = parseFloat(r["Latitude"] || r["latitude"] || r["lat"] || "") || null;
            const lng = parseFloat(r["Longitude"] || r["longitude"] || r["lng"] || "") || null;
            const studentCount = parseInt(r["Student Count"] || r["student_count"] || r["studentCount"] || "0") || 0;
            return {
              name,
              municipality,
              institutionType,
              lat,
              lng,
              studentCount,
              status: lat && lng ? "verified" : "pending",
            };
          })
          .filter((r: ImportRow) => r.name.length > 0);

        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    if (file.name.endsWith(".json") || file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
}

interface SchoolImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SchoolImportDialog({ open, onOpenChange }: SchoolImportDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const processFile = async (file: File) => {
    setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      setRows(parsed);
    } catch {
      toast({ variant: "destructive", title: "Parse Error", description: "Could not read the file. Check the format." });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const runGeocoding = async () => {
    const needsGeo = rows.filter(r => !r.lat || !r.lng);
    if (needsGeo.length === 0) return;
    setIsGeocoding(true);
    setGeocodeProgress(0);
    let done = 0;

    const updated = [...rows];
    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (!row.lat || !row.lng) {
        updated[i] = { ...row, status: "geocoding" };
        setRows([...updated]);
        const coords = await geocodeSchool(row.name, row.municipality);
        if (coords) {
          updated[i] = { ...row, ...coords, status: "located", statusMessage: "Auto-located via Nominatim" };
        } else {
          updated[i] = { ...row, status: "error", statusMessage: "Could not geolocate — check name/municipality" };
        }
        setRows([...updated]);
        done++;
        setGeocodeProgress(Math.round((done / needsGeo.length) * 100));
        await delay(1200);
      }
    }
    setIsGeocoding(false);
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => r.lat && r.lng && r.name && r.status !== "error");
    if (validRows.length === 0) {
      toast({ variant: "destructive", title: "Nothing to import", description: "Resolve missing coordinates first." });
      return;
    }
    setIsImporting(true);
    try {
      const payload = validRows.map(r => ({
        name: r.name,
        municipality: r.municipality || null,
        institutionType: r.institutionType || null,
        lat: r.lat!,
        lng: r.lng!,
        studentCount: r.studentCount,
        geoStatus: r.status === "located" ? "auto-located" : "verified",
      }));
      const res = await fetch("/api/schools/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schools: payload }),
      });
      if (!res.ok) throw new Error("Import failed");
      await queryClient.invalidateQueries({ queryKey: [api.schools.list.path] });
      toast({ title: "Import Successful", description: `${validRows.length} school(s) imported.` });
      setRows([]);
      setFileName("");
      onOpenChange(false);
    } catch {
      toast({ variant: "destructive", title: "Import Failed", description: "Could not save schools to database." });
    } finally {
      setIsImporting(false);
    }
  };

  const needsGeocoding = rows.some(r => !r.lat || !r.lng);
  const validCount = rows.filter(r => r.lat && r.lng && r.status !== "error").length;

  const statusBadge = (row: ImportRow) => {
    switch (row.status) {
      case "verified": return <Badge className="bg-green-500/15 text-green-700 border-green-500/20 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>;
      case "located": return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20 text-[10px]"><MapPin className="w-3 h-3 mr-1" />Auto-Located</Badge>;
      case "geocoding": return <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/20 text-[10px]"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Locating...</Badge>;
      case "error": return <Badge className="bg-red-500/15 text-red-700 border-red-500/20 text-[10px]"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]"><AlertCircle className="w-3 h-3 mr-1" />No Coords</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-card">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Schools
          </DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx), CSV, or JSON file. Schools without coordinates will be auto-geolocated.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {rows.length === 0 ? (
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/30"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground">Drag & drop or click to upload</p>
              <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .csv, .json</p>
              <p className="text-xs text-muted-foreground mt-3 font-mono bg-muted inline-block px-2 py-1 rounded">
                Columns: School Name | Municipality | Institution Type | Latitude | Longitude | Student Count
              </p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.json" className="hidden" onChange={handleFileChange} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <Badge variant="outline">{rows.length} rows</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setRows([]); setFileName(""); }}>
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              </div>

              <ScrollArea className="h-[280px] border rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-semibold text-muted-foreground">School Name</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Municipality</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Type</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Students</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium max-w-[180px] truncate" title={row.name}>{row.name}</td>
                        <td className="p-3 text-muted-foreground">{row.municipality || "—"}</td>
                        <td className="p-3 text-muted-foreground max-w-[120px] truncate">{row.institutionType || "—"}</td>
                        <td className="p-3 text-right font-bold text-primary">{row.studentCount}</td>
                        <td className="p-3">{statusBadge(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              {isGeocoding && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Geolocating schools via Nominatim...</span>
                    <span>{geocodeProgress}%</span>
                  </div>
                  <Progress value={geocodeProgress} className="h-1.5" />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{validCount}</span> of {rows.length} schools ready to import
                </p>
                <div className="flex gap-2">
                  {needsGeocoding && !isGeocoding && (
                    <Button variant="outline" onClick={runGeocoding} className="gap-2">
                      <MapPin className="w-4 h-4" />
                      Auto-Geolocate ({rows.filter(r => !r.lat || !r.lng).length})
                    </Button>
                  )}
                  <Button
                    onClick={handleImport}
                    disabled={validCount === 0 || isImporting || isGeocoding}
                    className="gap-2 bg-primary hover:bg-primary/90"
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Import {validCount} Schools
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
