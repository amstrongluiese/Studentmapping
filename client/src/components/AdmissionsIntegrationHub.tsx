import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  CheckCircle2,
  CloudCog,
  FileSpreadsheet,
  GitBranch,
  Loader2,
  MapPinned,
  RefreshCw,
  Sheet,
  UploadCloud,
  Activity,
  GitMerge,
  X,
} from "lucide-react";
import { type SchoolRegistry as School } from "@shared/schema";
import { api, type IntegrationPreviewInput, type SchoolInput } from "@shared/routes";
import { requestGeocodeSchool } from "@/lib/geocodeSchoolApi";
import { hasCoordinates, normalizeSchoolName } from "@shared/schoolRegistry";
import {
  SYSTEM_FIELDS,
  buildAdmissionsPreview,
  buildGisSyncRecords,
  collectFields,
  loadImportedAdmissionFingerprints,
  parseAdmissions,
  saveImportedAdmissionFingerprints,
  suggestFieldMappings,
  type AdmissionsPreviewRow,
  type FieldMapping,
  type SourceRecord,
} from "@/lib/admissionsIntegration";
import { useSyncStudents } from "@/hooks/use-gis-admin";
import { useImportSchools } from "@/hooks/use-schools";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UnmatchedSchoolsQueue } from "./UnmatchedSchoolsQueue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type SourceMode = "api" | "googleSheets" | "file";

interface AdmissionsIntegrationHubProps {
  existingSchools: School[];
}

interface ImportEvent {
  id: string;
  message: string;
  tone: "success" | "warning" | "error";
}

const sourcePriority: Array<{
  mode: SourceMode;
  label: string;
  description: string;
  icon: typeof CloudCog;
}> = [
  {
    mode: "api",
    label: "API Integration",
    description: "Reusable live admissions feed for Student Name, Student ID, and Last Attended School.",
    icon: CloudCog,
  },
  {
    mode: "googleSheets",
    label: "Google Sheets",
    description: "Connect a public sheet export and process rows through the same matching workflow.",
    icon: Sheet,
  },
  {
    mode: "file",
    label: "Manual Upload",
    description: "Import Excel, CSV, JSON, or exported Google Sheets files when no live source is available.",
    icon: UploadCloud,
  },
];

export function AdmissionsIntegrationHub({ existingSchools }: AdmissionsIntegrationHubProps) {
  const { toast } = useToast();
  const importSchools = useImportSchools();
  const syncStudents = useSyncStudents();
  const [sourceMode, setSourceMode] = useState<SourceMode>("api");
  const [records, setRecords] = useState<SourceRecord[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [fileName, setFileName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiMethod, setApiMethod] = useState<"GET" | "POST">("GET");
  const [authMode, setAuthMode] = useState<"none" | "bearer" | "apiKey">("none");
  const [authToken, setAuthToken] = useState("");
  const [apiKeyHeader, setApiKeyHeader] = useState("X-API-Key");
  const [apiBody, setApiBody] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [showMapping, setShowMapping] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [lastSource, setLastSource] = useState("No source connected");
  const [events, setEvents] = useState<ImportEvent[]>([]);
  const [autoSyncApi, setAutoSyncApi] = useState(false);
  const [autoSyncSheets, setAutoSyncSheets] = useState(false);
  const [autoSyncFile, setAutoSyncFile] = useState(false);
  const [importedFingerprints, setImportedFingerprints] = useState<Set<string>>(() => loadImportedAdmissionFingerprints());
  const [manualMatches, setManualMatches] = useState<Record<string, School>>({});

  console.log("[DEBUG] Render state:", { 
    recordsLength: records.length, 
    fieldsLength: fields.length,
    mappingKeys: Object.keys(fieldMapping).length,
    sourceMode 
  });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (sourceMode === "api" && autoSyncApi) {
      interval = setInterval(() => void loadRemoteSource("api", true), 30000);
    } else if (sourceMode === "googleSheets" && autoSyncSheets) {
      interval = setInterval(() => void loadRemoteSource("googleSheets", true), 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sourceMode, autoSyncApi, autoSyncSheets]);

  const preview = useMemo(
    () => buildAdmissionsPreview(records, fieldMapping, existingSchools, importedFingerprints, manualMatches),
    [existingSchools, fieldMapping, importedFingerprints, records, manualMatches],
  );

  const summary = useMemo(() => {
    const matched = preview.filter((row) => row.matchedSchool).length;
    const feederRows = preview.filter((row) => row.feederSchool && row.status !== "duplicate").length;
    const duplicates = preview.filter((row) => row.status === "duplicate").length;
    return {
      total: preview.length,
      matched,
      ready: Math.max(0, matched),
      duplicates,
      progress: preview.length ? Math.round((matched / preview.length) * 100) : 0,
    };
  }, [preview]);

  const mappedFields = useMemo(
    () => Object.entries(fieldMapping).filter(([, value]) => value !== "ignore"),
    [fieldMapping],
  );

  const unmatchedSchoolNames = useMemo(() => {
    const names = preview
      .filter((row) => row.status === "unmatched" && row.feederSchoolRegistry)
      .map((row) => row.feederSchoolRegistry);
    return Array.from(new Set(names));
  }, [preview]);

  const addEvent = useCallback((tone: ImportEvent["tone"], message: string) => {
    setEvents((current) => [{ id: crypto.randomUUID(), tone, message }, ...current].slice(0, 6));
  }, []);

  const hydrateSource = useCallback((nextRecords: SourceRecord[], nextFields: string[], label: string, silent = false) => {
    console.log("[DEBUG] hydrateSource called with", { nextRecordsLength: nextRecords.length, nextFields, label, silent });
    const suggestions = suggestFieldMappings(nextFields);
    setRecords(nextRecords);
    setFields(nextFields);
    setFieldMapping((current) => {
       if (silent || Object.keys(current).length > 0) return current;
       return suggestions.mapping;
    });
    setLastSource(label);
    if (!silent) {
      addEvent("success", `${label}: ${nextRecords.length.toLocaleString()} admissions records detected.`);
      setShowMapping(true);
    }
  }, [addEvent]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    try {
      const source = await parseAdmissions(file);
      hydrateSource(source.records, source.fields, file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to parse admissions file.";
      addEvent("error", message);
      toast({ title: "Import failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const loadRemoteSource = useCallback(async (mode: Exclude<SourceMode, "file">, silent = false) => {
    const url = mode === "api" ? apiUrl.trim() : sheetUrl.trim();
    if (!url) {
      if (!silent) toast({
        title: mode === "api" ? "API URL required" : "Google Sheets URL required",
        description: "Connect a source before processing admissions data.",
        variant: "destructive",
      });
      return;
    }

    if (!silent) setIsLoading(true);
    try {
      const payload: IntegrationPreviewInput = {
        sourceType: mode === "api" ? "api" : "googleSheets",
        url,
        method: mode === "api" ? apiMethod : "GET",
        authMode: mode === "api" ? authMode : "none",
        authToken: mode === "api" ? authToken : undefined,
        apiKeyHeader: mode === "api" ? apiKeyHeader : undefined,
        body: mode === "api" && apiMethod === "POST" ? apiBody : undefined,
      };

      const response = await fetch(api.integrations.preview.path, {
        method: api.integrations.preview.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      console.log("[DEBUG] Fetch response status:", response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unable to connect to source." }));
        throw new Error(error.message);
      }

      const rawData = await response.json();
      console.log("[DEBUG] Fetch JSON parsed:", rawData);

      const source = api.integrations.preview.responses[200].parse(rawData);
      console.log("[DEBUG] Zod parsed successfully, records:", source.records?.length);
      hydrateSource(source.records, source.fields.length ? source.fields : collectFields(source.records), source.sourceLabel, silent);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to connect to source.";
      if (!silent) {
         addEvent("error", message);
         toast({ title: "Source connection failed", description: message, variant: "destructive" });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [addEvent, apiBody, apiKeyHeader, apiMethod, apiUrl, authMode, authToken, hydrateSource, sheetUrl, toast]);

  const updateMapping = (sourceField: string, target: string) => {
    setFieldMapping((current) => ({ ...current, [sourceField]: target as FieldMapping[string] }));
  };

  const [importProgress, setImportProgress] = useState<{ total: number; processed: number; matched: number; unmatched: number; errors: number; percentage: number; isProcessing: boolean } | null>(null);

  const applyToGis = async () => {
    if (records.length === 0) {
      toast({ title: "No records", description: "There are no records to process.", variant: "destructive" });
      return;
    }

    setIsApplying(true);
    try {
      // 1. Start the import session
      const startRes = await fetch("/api/imports/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalRecords: records.length }),
      });
      if (!startRes.ok) throw new Error("Failed to start import session");

      // 2. Chunk records into batches of 100
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await fetch("/api/imports/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: batch }),
        });
      }

      // 3. Poll for progress
      const pollProgress = () => {
        const interval = setInterval(async () => {
          try {
            const res = await fetch("/api/imports/progress");
            const data = await res.json();
            setImportProgress(data);

            if (!data.isProcessing && data.percentage === 100) {
              clearInterval(interval);
              setIsApplying(false);
              addEvent("success", `Successfully processed ${data.total} records.`);
              toast({ title: "Import complete", description: `Processed ${data.total} records seamlessly in the background.` });
              
              // Move imported fingerprints
              const nextFingerprints = new Set(importedFingerprints);
              preview.forEach(row => nextFingerprints.add(row.fingerprint));
              saveImportedAdmissionFingerprints(nextFingerprints);
              setImportedFingerprints(nextFingerprints);
            }
          } catch (e) {
            console.error("Progress polling error", e);
          }
        }, 1000);
      };
      
      pollProgress();
      addEvent("success", `Queued ${records.length} records for background processing.`);
      toast({ title: "Import started", description: "Processing records in the background." });

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to apply GIS updates.";
      addEvent("error", message);
      toast({ title: "Import failed", description: message, variant: "destructive" });
      setIsApplying(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col w-full bg-transparent overflow-hidden">
      
      {/* 1. Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200/40 px-6 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">Data Syncing</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium hover:bg-slate-200/80 rounded-md shadow-none">Rows: {summary.total}</Badge>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100/80 rounded-md shadow-none">Ready: {summary.ready}</Badge>
            <Badge variant="secondary" className="bg-amber-50 text-amber-700 font-medium hover:bg-amber-100/80 rounded-md shadow-none">Unmatched: {summary.total - summary.matched - summary.duplicates}</Badge>
            {summary.duplicates > 0 && <Badge variant="secondary" className="bg-rose-50 text-rose-700 font-medium hover:bg-rose-100/80 rounded-md shadow-none">Dupes: {summary.duplicates}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="sm" className="h-8 gap-2 text-[13px] font-medium" onClick={() => setShowLogs(true)}>
              <Activity className="h-3.5 w-3.5" />
              Activity Logs {events.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 rounded-full px-1 text-[10px] font-semibold bg-slate-200 text-slate-700">{events.length}</Badge>}
           </Button>
           <Button variant="ghost" size="sm" className="h-8 gap-2 text-[13px] font-medium" onClick={() => setShowMapping(true)}>
              <GitMerge className="h-3.5 w-3.5" />
              Field Mapping {mappedFields.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 rounded-full px-1 text-[10px] font-semibold bg-teal-100 text-teal-700">{mappedFields.length}</Badge>}
           </Button>
           <Button size="sm" className="h-8 gap-2 px-4 text-[13px] font-medium shadow-sm" disabled={isApplying || records.length === 0} onClick={applyToGis}>
             {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPinned className="h-3.5 w-3.5" />}
             {isApplying ? "Processing..." : "Import Batch"}
           </Button>
        </div>
      </div>
      
      {/* Import Progress Overlay */}
      {importProgress && importProgress.isProcessing && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Importing {importProgress.total} records...</span>
            <span className="text-sm font-bold text-slate-900">{importProgress.percentage}%</span>
          </div>
          <Progress value={importProgress.percentage} className="h-2" />
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <span>Processed: {importProgress.processed}</span>
            <span className="text-emerald-600">Matched: {importProgress.matched}</span>
            <span className="text-amber-600">Unmatched: {importProgress.unmatched}</span>
            {importProgress.errors > 0 && <span className="text-rose-600">Errors: {importProgress.errors}</span>}
          </div>
        </div>
      )}

      {/* 2. Source & Connection Row */}
      <div className="flex shrink-0 flex-col gap-4 border-b border-slate-100 px-6 py-4">
         <div className="flex items-center gap-1.5">
            {sourcePriority.map((source) => {
              const Icon = source.icon;
              return (
                <Button 
                   key={source.mode} 
                   variant={sourceMode === source.mode ? "secondary" : "ghost"} 
                   size="sm"
                   className={cn("h-7 gap-1.5 rounded-md px-3 text-[12px] font-medium", sourceMode !== source.mode && "text-slate-500 hover:text-slate-700")}
                   onClick={() => setSourceMode(source.mode)}
                 >
                   <Icon className="h-3.5 w-3.5" />
                   {source.label}
                 </Button>
              );
            })}
         </div>

         <div className="flex w-full items-start gap-2">
           {sourceMode === "api" && (
             <div className="flex w-full max-w-4xl flex-col gap-2">
               <div className="flex w-full items-center gap-2">
                 <Select value={apiMethod} onValueChange={(value) => setApiMethod(value as "GET" | "POST")}>
                   <SelectTrigger className="w-[80px] h-9 bg-white border-slate-200 text-[13px] shadow-sm"><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="GET" className="text-[13px]">GET</SelectItem>
                     <SelectItem value="POST" className="text-[13px]">POST</SelectItem>
                   </SelectContent>
                 </Select>
                 <Input className="h-9 min-w-[200px] flex-1 bg-white border-slate-200 text-[13px] shadow-sm transition-colors focus-visible:ring-1" placeholder="https://admissions.example.edu/api/enrollees" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
                 <Select value={authMode} onValueChange={(value) => setAuthMode(value as "none" | "bearer" | "apiKey")}>
                   <SelectTrigger className="w-[120px] h-9 bg-white border-slate-200 text-[13px] shadow-sm"><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="none" className="text-[13px]">No Auth</SelectItem>
                     <SelectItem value="bearer" className="text-[13px]">Bearer</SelectItem>
                     <SelectItem value="apiKey" className="text-[13px]">API Key</SelectItem>
                   </SelectContent>
                 </Select>
                 {authMode === "apiKey" && (
                   <Input className="w-32 h-9 bg-white border-slate-200 text-[13px] shadow-sm focus-visible:ring-1" placeholder="Header Name" value={apiKeyHeader} onChange={(e) => setApiKeyHeader(e.target.value)} />
                 )}
                 {authMode !== "none" && (
                   <Input type="password" placeholder="Token" className="w-40 h-9 bg-white border-slate-200 text-[13px] shadow-sm focus-visible:ring-1" value={authToken} onChange={(e) => setAuthToken(e.target.value)} />
                 )}
                 <Button size="sm" className="h-9 gap-2 px-5 text-[13px] font-medium shadow-sm" disabled={isLoading} onClick={() => void loadRemoteSource("api")}>
                   {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudCog className="h-4 w-4" />}
                   Fetch Data
                 </Button>
                 <div className="flex items-center gap-2 ml-2 shrink-0">
                   <Switch id="auto-sync-api" checked={autoSyncApi} onCheckedChange={setAutoSyncApi} />
                   <label htmlFor="auto-sync-api" className="text-[12px] font-medium text-slate-600 cursor-pointer">Auto Sync</label>
                 </div>
               </div>
               {apiMethod === "POST" && (
                 <Textarea
                    className="min-h-[60px] bg-white border-slate-200 text-[13px] font-mono shadow-sm focus-visible:ring-1 mt-1"
                    placeholder='{"term":"2026-2027"}'
                    value={apiBody}
                    onChange={(e) => setApiBody(e.target.value)}
                 />
               )}
             </div>
           )}

           {sourceMode === "googleSheets" && (
             <div className="flex w-full max-w-3xl items-center gap-2">
               <Input className="h-9 flex-1 bg-white border-slate-200 text-[13px] shadow-sm focus-visible:ring-1" placeholder="Paste public Google Sheets URL" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
               <Button size="sm" className="h-9 gap-2 px-5 text-[13px] font-medium shadow-sm" disabled={isLoading} onClick={() => void loadRemoteSource("googleSheets")}>
                 {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sheet className="h-4 w-4" />}
                 Fetch Sheet
               </Button>
               <div className="flex items-center gap-2 ml-2 shrink-0">
                 <Switch id="auto-sync-sheets" checked={autoSyncSheets} onCheckedChange={setAutoSyncSheets} />
                 <label htmlFor="auto-sync-sheets" className="text-[12px] font-medium text-slate-600 cursor-pointer">Auto Sync</label>
               </div>
             </div>
           )}

           {sourceMode === "file" && (
             <div className="flex w-full max-w-xl items-center gap-3">
               <Input id="workspace-file-upload" type="file" className="h-9 flex-1 bg-white border-slate-200 text-[13px] shadow-sm cursor-pointer file:text-[13px] file:font-medium file:h-full file:bg-slate-50 file:border-0 file:mr-3 focus-visible:ring-1" accept=".xlsx,.xls,.csv,.json" onChange={handleFileChange} />
               {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
               <div className="flex items-center gap-2 ml-2 shrink-0">
                 <Switch id="auto-sync-file" checked={autoSyncFile} onCheckedChange={setAutoSyncFile} />
                 <label htmlFor="auto-sync-file" className="text-[12px] font-medium text-slate-600 cursor-pointer">Auto Sync</label>
               </div>
             </div>
           )}
         </div>
      </div>

      {/* 3. Modal Dialogs for Activity Logs & Field Mapping */}

      {/* Activity Logs Modal */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-lg w-full rounded-2xl border border-white/60 bg-white/95 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.4)] backdrop-blur-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-[15px] font-semibold text-slate-900">Activity Logs</DialogTitle>
                <DialogDescription className="text-[12px] text-slate-500 mt-0.5">
                  Real-time sync and import events from this session.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[420px]">
            <div className="flex flex-col gap-2.5 px-6 py-5">
              {events.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-300">
                    <Activity className="h-5 w-5" />
                  </span>
                  <p className="text-[13px] font-medium text-slate-500">No activity yet</p>
                  <p className="text-[12px] text-slate-400">Connect a source and fetch data to start logging.</p>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] shadow-sm",
                    eventTone(event.tone)
                  )}>
                    <span className="mt-0.5 shrink-0">
                      {event.tone === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : event.tone === "warning" ? (
                        <Activity className="h-4 w-4 text-amber-500" />
                      ) : (
                        <X className="h-4 w-4 text-rose-500" />
                      )}
                    </span>
                    <span className="leading-relaxed">{event.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end border-t border-slate-100 px-6 py-4">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="h-8 px-5 text-[13px]">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Mapping Modal */}
      <Dialog open={showMapping} onOpenChange={setShowMapping}>
        <DialogContent className="max-w-2xl w-full rounded-2xl border border-white/60 bg-white/95 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.4)] backdrop-blur-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600">
                <GitMerge className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-[15px] font-semibold text-slate-900">Field Mapping</DialogTitle>
                <DialogDescription className="text-[12px] text-slate-500 mt-0.5">
                  Map each source column to a GIS system field. Set to Ignore to skip.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[460px]">
            <div className="px-6 py-5">
              {fields.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-teal-50 text-teal-300">
                    <GitMerge className="h-5 w-5" />
                  </span>
                  <p className="text-[13px] font-medium text-slate-500">No fields detected yet</p>
                  <p className="text-[12px] text-slate-400">Connect a source and fetch data to configure field mappings.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div key={field} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 shadow-sm transition-colors hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-slate-700" title={field}>{field}</p>
                        <p className="text-[10px] text-slate-400">source column</p>
                      </div>
                      <Select value={fieldMapping[field] || "ignore"} onValueChange={(value) => updateMapping(field, value)}>
                        <SelectTrigger className="h-8 w-36 shrink-0 bg-white text-[11px] border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ignore" className="text-[11px] text-slate-400">— Ignore —</SelectItem>
                          {SYSTEM_FIELDS.map((systemField) => (
                            <SelectItem key={systemField.key} value={systemField.key} className="text-[11px]">{systemField.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-[12px] text-slate-500">
              {mappedFields.length > 0 ? (
                <span className="font-medium text-teal-700">{mappedFields.length} field{mappedFields.length !== 1 ? 's' : ''} mapped</span>
              ) : (
                <span>No fields mapped yet</span>
              )}
            </p>
            <DialogClose asChild>
              <Button size="sm" className="h-8 px-5 text-[13px]">Done</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {unmatchedSchoolNames.length > 0 && (
        <div className="px-6 pb-6 w-full">
          <UnmatchedSchoolsQueue
            unmatchedSchoolNames={unmatchedSchoolNames}
            manualMatches={manualMatches}
            existingSchools={existingSchools}
            onResolveMatch={(name, school) => {
              setManualMatches(prev => {
                if (!school) {
                  const next = { ...prev };
                  delete next[name];
                  return next;
                }
                return { ...prev, [name]: school };
              });
            }}
          />
        </div>
      )}

      {/* 4. Full-bleed Table */}
      <div className="flex min-h-0 flex-1 flex-col w-full bg-transparent">
         <div className="overflow-auto flex-1 w-full">
           <Table className="min-w-[1000px] w-full">
             <TableHeader className="sticky top-0 z-10 bg-white/40 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
               <TableRow className="hover:bg-transparent border-0">
                 <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10 px-6">Student #</TableHead>
                 <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Full Name</TableHead>
                 <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Course</TableHead>
                 <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Admission Type</TableHead>
                 <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Last School</TableHead>
                 <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">School Type</TableHead>
                 <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Municipality</TableHead>
                 <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Source</TableHead>
                 <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10 text-right px-6">Status</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {preview.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={9} className="h-64 text-center">
                     <p className="text-[14px] font-medium text-slate-700">No data to preview</p>
                     <p className="text-[13px] text-slate-500 mt-1">Connect a source and fetch records to begin mapping.</p>
                     {records.length > 0 && <p className="text-[13px] text-amber-600 mt-2">Debug: {records.length} records in memory, but preview array is empty!</p>}
                   </TableCell>
                 </TableRow>
               ) : (
                 preview.map((row) => {
                   const admissionType = String(row.sourceRecord[Object.entries(fieldMapping).find(([, mapped]) => mapped === "studentType")?.[0] || ""] || "") || "—";
                   const schoolType = row.matchedSchool?.institutionType || inferSchoolType(row.feederSchool);
                   const municipality = row.matchedSchool?.municipality || row.municipality || "Laguna";
                   
                   return (
                     <TableRow key={`${row.fingerprint}-${row.rowNumber}`} className="text-[13px] hover:bg-slate-50/80 transition-colors border-b border-slate-50">
                       <TableCell className="font-mono text-[12px] text-slate-500 whitespace-nowrap px-6">{row.studentNumber || "—"}</TableCell>
                       <TableCell className="font-medium text-slate-900 whitespace-nowrap">{row.fullName || "—"}</TableCell>
                       <TableCell className="whitespace-nowrap text-slate-600">{row.program || row.strand || "—"}</TableCell>
                       <TableCell className="whitespace-nowrap text-slate-600">{admissionType}</TableCell>
                       <TableCell className="max-w-[240px] truncate text-slate-800" title={row.feederSchool}>{row.feederSchool || "—"}</TableCell>
                       <TableCell className="whitespace-nowrap text-slate-600">{schoolType}</TableCell>
                       <TableCell className="whitespace-nowrap text-slate-600">{municipality}</TableCell>
                       <TableCell className="whitespace-nowrap text-slate-500 text-[12px]">{lastSource}</TableCell>
                       <TableCell className="whitespace-nowrap text-right px-6" title={row.issues.join("\n")}>
                         <Badge variant="outline" className={cn("text-[11px] font-medium tracking-wide shadow-none border-transparent cursor-help", statusTone(row))}>
                           {row.status === "matched" ? "Matched" : row.status === "unmatched" ? "Unmatched" : row.status === "duplicate" ? "Duplicate" : "Blocked"}
                         </Badge>
                       </TableCell>
                     </TableRow>
                   );
                 })
               )}
             </TableBody>
           </Table>
         </div>
      </div>
    </div>
  );
}





function inferSchoolType(name: string) {
  const normalized = normalizeSchoolName(name);
  if (/\b(college|university|institute)\b/.test(normalized)) return "College";
  if (/\b(senior high school|national high school|high school|shs|nhs)\b/.test(normalized)) return "Senior High School";
  return "Feeder Institution";
}

function statusTone(row: AdmissionsPreviewRow) {
  if (row.status === "matched") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (row.status === "unmatched") return "border-amber-200 bg-amber-50 text-amber-700";
  if (row.status === "duplicate") return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function eventTone(tone: ImportEvent["tone"]) {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}


