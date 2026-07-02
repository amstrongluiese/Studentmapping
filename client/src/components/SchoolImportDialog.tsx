import { useMemo, useState, type ReactNode } from "react";
import { HiOutlineDocumentArrowUp, HiOutlineMapPin, HiOutlineSparkles } from "react-icons/hi2";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { type SchoolRegistry as School } from "@shared/schema";
import { useImportSchools } from "@/hooks/use-schools";
import {
  geocodeMissingSchools,
  getImportableSchools,
  parseSchoolFile,
  prepareSchoolImport,
  type ImportProgress,
  type SchoolImportPreview,
} from "@/lib/schoolImport";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface SchoolImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSchools: School[];
}

const statusTone: Record<string, string> = {
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Auto-Located": "bg-sky-50 text-sky-700 border-sky-200",
  "Needs Review": "bg-amber-50 text-amber-700 border-amber-200",
  "Missing Coordinates": "bg-rose-50 text-rose-700 border-rose-200",
  "Duplicate Entry": "bg-slate-100 text-slate-600 border-slate-200",
};

export function SchoolImportDialog({ open, onOpenChange, existingSchools }: SchoolImportDialogProps) {
  const importSchools = useImportSchools();
  const [preview, setPreview] = useState<SchoolImportPreview[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const summary = useMemo(() => {
    const total = preview.length;
    const importable = getImportableSchools(preview).length;
    const missing = preview.filter((row) => row.importStatus === "Missing Coordinates").length;
    const duplicates = preview.filter((row) => row.importStatus === "Duplicate Entry").length;
    const verified = preview.filter((row) => row.importStatus === "Verified" || row.importStatus === "Auto-Located").length;

    return { total, importable, missing, duplicates, verified };
  }, [preview]);

  const reset = () => {
    setPreview([]);
    setFileName("");
    setError("");
    setProgress(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  };

  const handleFile = async (file?: File) => {
    if (!file) return;

    setIsParsing(true);
    setError("");
    setFileName(file.name);

    try {
      const parsed = await parseSchoolFile(file);
      const prepared = prepareSchoolImport(parsed, existingSchools);
      setPreview(prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read uploaded file.");
      setPreview([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAutoLocate = async () => {
    setIsGeocoding(true);
    setError("");

    try {
      const located = await geocodeMissingSchools(preview, setProgress);
      setPreview(located);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to geocode missing schools.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleImport = async () => {
    const schools = getImportableSchools(preview);
    await importSchools.mutateAsync(schools);
    handleOpenChange(false);
  };

  const progressValue = progress?.total ? Math.round((progress.completed / progress.total) * 100) : 0;
  const busy = isParsing || isGeocoding || importSchools.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden p-0">
        <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[330px_1fr]">
          <aside className="border-r bg-slate-950 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <HiOutlineDocumentArrowUp className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl text-white">School Registry Import</DialogTitle>
                <DialogDescription className="text-slate-300">
                  Excel, CSV, or JSON feeder school uploads.
                </DialogDescription>
              </div>
            </div>

            <label
              htmlFor="school-registry-file-upload"
              className="mt-8 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/25 bg-white/5 px-4 text-center transition hover:bg-white/10"
            >
              <UploadCloud className="mb-3 h-8 w-8 text-sky-200" />
              <span className="text-sm font-semibold">{fileName || "Choose school file"}</span>
              <span className="mt-1 text-xs text-slate-300">.xlsx, .csv, or .json</span>
              <input
                id="school-registry-file-upload"
                name="schoolRegistryFile"
                className="sr-only"
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                disabled={busy}
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <span className="text-slate-300">Rows read</span>
                <strong>{summary.total}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <span className="text-slate-300">Ready to save</span>
                <strong>{summary.importable}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <span className="text-slate-300">Verified/located</span>
                <strong>{summary.verified}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <span className="text-slate-300">Needs coordinates</span>
                <strong>{summary.missing}</strong>
              </div>
            </div>

            {isGeocoding && (
              <div className="mt-6 rounded-lg bg-sky-500/10 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 text-sky-100">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Locating {progress?.current}</span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>
            )}

            {error && (
              <div className="mt-6 flex gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </aside>

          <section className="flex min-h-0 flex-col bg-white">
            <DialogHeader className="border-b px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">Upload Preview</h3>
                  <p className="text-sm text-muted-foreground">
                    Required columns: School Name, Municipality, Institution Type, Latitude, Longitude, Altitude.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={busy || summary.missing === 0}
                    onClick={handleAutoLocate}
                  >
                    <HiOutlineMapPin className="h-4 w-4" />
                    Auto-Locate Missing
                  </Button>
                  <Button
                    className="gap-2"
                    disabled={busy || summary.importable === 0}
                    onClick={handleImport}
                  >
                    {importSchools.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save Registry
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 border-b bg-slate-50 px-6 py-4 md:grid-cols-4">
              <SummaryPill icon={<FileSpreadsheet className="h-4 w-4" />} label="Total" value={summary.total} />
              <SummaryPill icon={<CheckCircle2 className="h-4 w-4" />} label="Ready" value={summary.importable} />
              <SummaryPill icon={<HiOutlineSparkles className="h-4 w-4" />} label="Located" value={summary.verified} />
              <SummaryPill icon={<AlertCircle className="h-4 w-4" />} label="Duplicates" value={summary.duplicates} />
            </div>

            <ScrollArea className="min-h-0 flex-1">
              {isParsing ? (
                <div className="flex h-full min-h-80 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reading file...
                </div>
              ) : preview.length === 0 ? (
                <div className="flex h-full min-h-80 flex-col items-center justify-center px-8 text-center text-muted-foreground">
                  <FileSpreadsheet className="mb-3 h-10 w-10 text-slate-300" />
                  <p className="font-medium text-foreground">No upload preview yet</p>
                  <p className="mt-1 max-w-md text-sm">
                    Upload the admissions feeder school file and this panel will show validation, registry matches, and coordinate status.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {preview.map((row) => (
                    <div key={row.rowNumber} className="grid gap-3 px-6 py-4 md:grid-cols-[1fr_160px_150px]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold">{row.schoolName}</p>
                          <span className="text-xs text-muted-foreground">Row {row.rowNumber}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.municipality} · {row.schoolType}
                        </p>
                        {row.issues.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">{row.issues.join(" ")}</p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{row.latitude?.toFixed(5) || "No latitude"}</p>
                        <p>{row.longitude?.toFixed(5) || "No longitude"}</p>
                      </div>
                      <div className="flex items-start justify-start md:justify-end">
                        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", statusTone[row.importStatus])}>
                          {row.importStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryPill({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}
