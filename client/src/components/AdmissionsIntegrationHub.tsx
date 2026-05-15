import { useCallback, useMemo, useState, type ChangeEvent } from "react";
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
} from "lucide-react";
import type { School } from "@shared/schema";
import { api, type IntegrationPreviewInput, type SchoolInput } from "@shared/routes";
import { hasCoordinates, normalizeSchoolName } from "@shared/schoolRegistry";
import {
  SYSTEM_FIELDS,
  buildAdmissionsPreview,
  buildGisSyncRecords,
  collectFields,
  loadImportedAdmissionFingerprints,
  parseAdmissionsFile,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  const [liveSync, setLiveSync] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [lastSource, setLastSource] = useState("No source connected");
  const [events, setEvents] = useState<ImportEvent[]>([]);
  const [importedFingerprints, setImportedFingerprints] = useState<Set<string>>(() => loadImportedAdmissionFingerprints());

  const preview = useMemo(
    () => buildAdmissionsPreview(records, fieldMapping, existingSchools, importedFingerprints),
    [existingSchools, fieldMapping, importedFingerprints, records],
  );

  const summary = useMemo(() => {
    const matched = preview.filter((row) => row.matchedSchool).length;
    const feederRows = preview.filter((row) => row.feederSchool && row.status !== "duplicate").length;
    const duplicates = preview.filter((row) => row.status === "duplicate").length;
    const needsGeocode = preview.filter((row) => row.feederSchool && !row.matchedSchool && !hasIncomingCoordinates(row)).length;
    const ready = feederRows - duplicates;

    return {
      total: preview.length,
      matched,
      ready: Math.max(0, ready),
      duplicates,
      needsGeocode,
      progress: preview.length ? Math.round((ready / preview.length) * 100) : 0,
    };
  }, [preview]);

  const mappedFields = useMemo(
    () => Object.entries(fieldMapping).filter(([, value]) => value !== "ignore"),
    [fieldMapping],
  );

  const addEvent = useCallback((tone: ImportEvent["tone"], message: string) => {
    setEvents((current) => [{ id: crypto.randomUUID(), tone, message }, ...current].slice(0, 6));
  }, []);

  const hydrateSource = useCallback((nextRecords: SourceRecord[], nextFields: string[], label: string) => {
    const suggestions = suggestFieldMappings(nextFields);
    setRecords(nextRecords);
    setFields(nextFields);
    setFieldMapping(suggestions.mapping);
    setLastSource(label);
    addEvent("success", `${label}: ${nextRecords.length.toLocaleString()} admissions records detected.`);
  }, [addEvent]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    try {
      const source = await parseAdmissionsFile(file);
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

  const loadRemoteSource = useCallback(async (mode: Exclude<SourceMode, "file">) => {
    const url = mode === "api" ? apiUrl.trim() : sheetUrl.trim();
    if (!url) {
      toast({
        title: mode === "api" ? "API URL required" : "Google Sheets URL required",
        description: "Connect a source before processing admissions data.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
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

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unable to connect to source." }));
        throw new Error(error.message);
      }

      const source = api.integrations.preview.responses[200].parse(await response.json());
      hydrateSource(source.records, source.fields.length ? source.fields : collectFields(source.records), source.sourceLabel);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to connect to source.";
      addEvent("error", message);
      toast({ title: "Source connection failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [addEvent, apiBody, apiKeyHeader, apiMethod, apiUrl, authMode, authToken, hydrateSource, sheetUrl, toast]);

  const updateMapping = (sourceField: string, target: string) => {
    setFieldMapping((current) => ({ ...current, [sourceField]: target as FieldMapping[string] }));
  };

  const applyToGis = async () => {
    const usableRows = preview.filter((row) => row.feederSchool && row.status !== "duplicate");
    if (usableRows.length === 0) {
      toast({
        title: "No admissions rows ready",
        description: "Connect a source with a Last Attended School or Senior High School field first.",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    try {
      const schools = await buildGeocodedSchoolUpdates(usableRows, existingSchools, addEvent);
      await importSchools.mutateAsync(schools);

      const syncRecords = buildGisSyncRecords(usableRows, fieldMapping);
      if (syncRecords.length > 0) {
        const syncResult = await syncStudents.mutateAsync({
          source: "admissions_integration",
          records: syncRecords,
        });
        addEvent(
          "success",
          `GIS pipeline synced ${syncResult.processed.toLocaleString()} students (${syncResult.schoolsGeocoded} schools geocoded).`,
        );
      }
      const nextFingerprints = new Set(importedFingerprints);
      usableRows.forEach((row) => nextFingerprints.add(row.fingerprint));
      saveImportedAdmissionFingerprints(nextFingerprints);
      setImportedFingerprints(nextFingerprints);
      addEvent("success", `${usableRows.length.toLocaleString()} admissions rows updated ${schools.length.toLocaleString()} feeder school markers.`);
      toast({
        title: "GIS map updated",
        description: "Feeder school counts, coordinates, and markers are now refreshed.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to apply GIS updates.";
      addEvent("error", message);
      toast({ title: "GIS update failed", description: message, variant: "destructive" });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">Primary Workflow</Badge>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{lastSource}</Badge>
            </div>
            <h2 className="mt-2 text-xl font-black">Admissions Data Integration</h2>
            <p className="text-sm text-muted-foreground">
              Admissions data to school detection, matching, geolocation, saved coordinates, GIS pins, and student counts.
            </p>
          </div>
          <Button className="h-10 gap-2" disabled={isApplying || summary.ready === 0} onClick={applyToGis}>
            {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
            Apply to GIS
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-h-0 overflow-auto p-4">
          <div className="grid gap-3 xl:grid-cols-3">
            {sourcePriority.map((source, index) => {
              const Icon = source.icon;
              return (
                <button
                  key={source.mode}
                  type="button"
                  onClick={() => setSourceMode(source.mode)}
                  className={cn(
                    "rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary/30",
                    sourceMode === source.mode && "border-primary/40 ring-2 ring-primary/10",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">
                      Priority {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 font-bold">{source.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{source.description}</p>
                </button>
              );
            })}
          </div>

          <Card className="mt-4 rounded-lg border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Source Connection</CardTitle>
              <CardDescription>Connect data, then the workflow detects schools and prepares GIS marker updates inside this import screen.</CardDescription>
            </CardHeader>
            <CardContent>
              {sourceMode === "api" && (
                <div className="space-y-3">
                  <Input className="h-10 bg-slate-50" placeholder="https://admissions.example.edu/api/enrollees" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select value={apiMethod} onValueChange={(value) => setApiMethod(value as "GET" | "POST")}>
                      <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={authMode} onValueChange={(value) => setAuthMode(value as "none" | "bearer" | "apiKey")}>
                      <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Auth</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="apiKey">API Key</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {authMode === "apiKey" && <Input className="h-10 bg-slate-50" value={apiKeyHeader} onChange={(event) => setApiKeyHeader(event.target.value)} />}
                  {authMode !== "none" && <Input className="h-10 bg-slate-50" type="password" placeholder="Token or API key" value={authToken} onChange={(event) => setAuthToken(event.target.value)} />}
                  {apiMethod === "POST" && <Textarea className="min-h-20 bg-slate-50" placeholder='{"term":"2026-2027"}' value={apiBody} onChange={(event) => setApiBody(event.target.value)} />}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button className="h-10 gap-2" disabled={isLoading} onClick={() => void loadRemoteSource("api")}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Retrieve Admissions Data
                    </Button>
                    <SettingInline label="Live sync" checked={liveSync} onChange={setLiveSync} />
                    <SettingInline label="Auto apply" checked={autoApply} onChange={setAutoApply} />
                  </div>
                </div>
              )}

              {sourceMode === "googleSheets" && (
                <div className="space-y-3">
                  <Input className="h-10 bg-slate-50" placeholder="Paste public Google Sheets URL" value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} />
                  <Button className="h-10 gap-2" disabled={isLoading} onClick={() => void loadRemoteSource("googleSheets")}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sheet className="h-4 w-4" />}
                    Retrieve Sheet Data
                  </Button>
                </div>
              )}

              {sourceMode === "file" && (
                <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary/30 bg-slate-50 p-5 text-center transition hover:bg-primary/[0.03]">
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <FileSpreadsheet className="h-8 w-8 text-primary" />}
                  <p className="mt-3 font-bold">{fileName || "Upload Excel, CSV, JSON, or Google Sheets export"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Manual uploads are processed through the same matching and geolocation pipeline.</p>
                  <input className="sr-only" type="file" accept=".xlsx,.xls,.csv,.json" onChange={handleFileChange} />
                </label>
              )}
            </CardContent>
          </Card>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Card className="rounded-lg border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detected Fields</CardTitle>
                <CardDescription>Map incoming source columns to the Student Mapping System fields.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {fields.length === 0 ? (
                  <EmptyLine text="Connect a source to detect admissions columns." />
                ) : fields.map((field) => (
                  <div key={field} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{field}</p>
                      <p className="truncate text-xs text-muted-foreground">{sampleValue(records, field)}</p>
                    </div>
                    <Select value={fieldMapping[field] || "ignore"} onValueChange={(value) => updateMapping(field, value)}>
                      <SelectTrigger className="h-9 bg-slate-50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignore">Ignore</SelectItem>
                        {SYSTEM_FIELDS.map((systemField) => (
                          <SelectItem key={systemField.key} value={systemField.key}>{systemField.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-lg border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="h-4 w-4 text-primary" />
                  School Matching in Import
                </CardTitle>
                <CardDescription>Fuse.js normalizes entries like Lumban NHS to their canonical feeder school record.</CardDescription>
              </CardHeader>
              <CardContent>
                {preview.length === 0 ? (
                  <EmptyLine text="Matched schools and geolocation needs will appear here." />
                ) : (
                  <div className="max-h-[470px] overflow-auto rounded-lg border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Detected Feeder</TableHead>
                          <TableHead>Match</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.slice(0, 80).map((row) => (
                          <TableRow key={row.fingerprint}>
                            <TableCell>
                              <p className="font-medium">{row.fullName || "Unnamed student"}</p>
                              <p className="text-xs text-muted-foreground">{row.studentNumber || `Row ${row.rowNumber}`}</p>
                            </TableCell>
                            <TableCell>{row.feederSchool || "Missing school"}</TableCell>
                            <TableCell>
                              {row.matchedSchool ? (
                                <div>
                                  <p className="font-medium">{row.matchedSchool.name}</p>
                                  <p className="text-xs text-muted-foreground">{row.matchConfidence}% confidence</p>
                                </div>
                              ) : row.feederSchool ? (
                                <span className="text-amber-700">Will geolocate as new school</span>
                              ) : (
                                <span className="text-rose-700">No school field</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={statusTone(row)}>{row.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        <aside className="min-h-0 overflow-auto border-l border-slate-200 bg-white p-4">
          <div className="space-y-4">
            <Card className="rounded-lg border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">GIS Readiness</CardTitle>
                <CardDescription>Rows become map markers after matching and coordinate save.</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={summary.progress} className="h-2" />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Metric label="Rows" value={summary.total} />
                  <Metric label="Matched" value={summary.matched} />
                  <Metric label="Ready" value={summary.ready} />
                  <Metric label="Geocode" value={summary.needsGeocode} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Workflow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  "Admissions Data",
                  "School Detection",
                  "Fuse.js Matching",
                  "Nominatim Geolocation",
                  "Save Coordinates",
                  "GIS Pin Mapping",
                  "Student Count Visualization",
                ].map((step, index) => (
                  <div key={step} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-black">{index + 1}</span>
                    <span className="font-medium">{step}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-lg border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {events.length === 0 ? (
                  <EmptyLine text="No import activity yet." />
                ) : events.map((event) => (
                  <div key={event.id} className={cn("rounded-lg border px-3 py-2 text-sm", eventTone(event.tone))}>
                    {event.message}
                  </div>
                ))}
              </CardContent>
            </Card>

            {mappedFields.length > 0 && (
              <Card className="rounded-lg border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Active Mapping</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mappedFields.slice(0, 8).map(([source, target]) => (
                    <div key={source} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <span className="truncate">{source}</span>
                      <strong className="truncate text-primary">{target}</strong>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

async function buildGeocodedSchoolUpdates(
  rows: AdmissionsPreviewRow[],
  existingSchools: School[],
  addEvent: (tone: ImportEvent["tone"], message: string) => void,
): Promise<SchoolInput[]> {
  const existingById = new Map(existingSchools.map((school) => [school.id, school]));
  const groups = new Map<string, { rows: AdmissionsPreviewRow[]; school?: School }>();

  rows.forEach((row) => {
    const school = row.matchedSchool ? existingById.get(row.matchedSchool.id) || row.matchedSchool : undefined;
    const key = school ? `school:${school.id}` : `new:${normalizeSchoolName(row.feederSchool)}`;
    const group = groups.get(key) || { rows: [], school };
    group.rows.push(row);
    groups.set(key, group);
  });

  const updates: SchoolInput[] = [];

  for (const { rows: schoolRows, school } of Array.from(groups.values())) {
    const first = schoolRows[0];
    const incomingLat = first.lat;
    const incomingLng = first.lng;
    let lat = school?.lat ?? incomingLat ?? null;
    let lng = school?.lng ?? incomingLng ?? null;
    let source = school?.source || "Admissions Integration";
    const name = school?.name || first.feederSchool;
    const municipality = first.municipality || school?.municipality || "Laguna";

    if (!hasCoordinates({ lat, lng })) {
      const geocoded = await geocodeSchool(name, municipality);
      if (geocoded) {
        lat = geocoded.lat;
        lng = geocoded.lng;
        source = "Nominatim + Admissions Integration";
        addEvent("success", `${name} geolocated and saved to the feeder registry.`);
      } else {
        addEvent("warning", `${name} needs manual coordinate review.`);
      }
    }

    const mapped = hasCoordinates({ lat, lng });
    updates.push({
      name,
      normalizedName: normalizeSchoolName(name),
      municipality,
      institutionType: school?.institutionType || inferSchoolType(name),
      lat,
      lng,
      altitude: school?.altitude ?? null,
      studentCount: (school?.studentCount || 0) + schoolRows.length,
      verified: school?.verified || mapped,
      status: mapped ? (school?.verified ? "Verified" : "Auto-Located") : "Missing Coordinates",
      source,
    });
  }

  return updates;
}

async function geocodeSchool(name: string, municipality: string) {
  const response = await fetch(api.geocode.school.path, {
    method: api.geocode.school.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, municipality }),
    credentials: "include",
  });

  if (!response.ok) return null;
  return api.geocode.school.responses[200].parse(await response.json());
}

function hasIncomingCoordinates(row: AdmissionsPreviewRow) {
  return hasCoordinates({ lat: row.lat, lng: row.lng });
}

function inferSchoolType(name: string) {
  const normalized = normalizeSchoolName(name);
  if (/\b(college|university|institute)\b/.test(normalized)) return "College";
  if (/\b(senior high school|national high school|high school|shs|nhs)\b/.test(normalized)) return "Senior High School";
  return "Feeder Institution";
}

function statusTone(row: AdmissionsPreviewRow) {
  if (row.status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (row.status === "needsReview") return "border-amber-200 bg-amber-50 text-amber-700";
  if (row.status === "duplicate") return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function eventTone(tone: ImportEvent["tone"]) {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function sampleValue(records: SourceRecord[], field: string) {
  const value = records.find((record) => record[field] != null && record[field] !== "")?.[field];
  return String(value ?? "No sample value").slice(0, 96);
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-muted-foreground">{text}</p>;
}

function SettingInline({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}
