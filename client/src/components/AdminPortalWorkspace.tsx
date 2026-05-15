import { useMemo, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  CloudOff,
  GitBranch,
  GraduationCap,
  MapPinned,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import type { Import, School, StudentProcessed } from "@shared/schema";
import { hasCoordinates } from "@shared/schoolRegistry";
import { formatAdmissionLabel, parseStudentNumberTag } from "@/lib/adminPortalUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type AdminPortalSection = "overview" | "feed" | "queue" | "registry" | "import-logs" | "settings";

export interface AdminPortalWorkspaceProps {
  section: AdminPortalSection;
  onSectionChange: (section: AdminPortalSection) => void;
  schools: School[];
  processedStudents: StudentProcessed[];
  gisOverview?: {
    totalStudentsSynced: number;
    freshmenCount: number;
    transfereeCount: number;
    verifiedSchools: number;
    unmappedSchools: number;
  } | null;
  importLogs: Import[];
  schoolsLoading: boolean;
  schoolsUpdatedAt: number;
  duplicateIds: Set<number>;
  renderIntegrationControls: () => ReactNode;
  renderGisWorkspaceSettings: () => ReactNode;
  renderSchoolRegistry: () => ReactNode;
  onAddSchool: () => void;
  onEditSchool: (school: School) => void;
  onGeolocateSchool: (school: School) => void;
  onDeleteSchool: (school: School) => void;
  onRemoveDuplicate: (school: School) => void;
}

const SECTION_TABS: { value: AdminPortalSection; label: string; short: string }[] = [
  { value: "overview", label: "Overview", short: "Overview" },
  { value: "feed", label: "Live Student Feed", short: "Feed" },
  { value: "queue", label: "Mapping Queue", short: "Queue" },
  { value: "registry", label: "School Registry", short: "Registry" },
  { value: "import-logs", label: "Import Logs", short: "Logs" },
  { value: "settings", label: "Settings", short: "Settings" },
];

function formatSyncTime(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function AdminPortalWorkspace({
  section,
  onSectionChange,
  schools,
  processedStudents,
  gisOverview,
  importLogs,
  schoolsLoading,
  schoolsUpdatedAt,
  duplicateIds,
  renderIntegrationControls,
  renderGisWorkspaceSettings,
  renderSchoolRegistry,
  onAddSchool,
  onEditSchool,
  onGeolocateSchool,
  onDeleteSchool,
  onRemoveDuplicate,
}: AdminPortalWorkspaceProps) {
  const overview = useMemo(() => {
    const verifiedSchools = gisOverview?.verifiedSchools ?? schools.filter((s) => s.verified && hasCoordinates(s)).length;
    const unmappedSchools = gisOverview?.unmappedSchools ?? schools.filter((s) => !hasCoordinates(s)).length;
    const totalStudentsSynced = gisOverview?.totalStudentsSynced ?? processedStudents.length;
    const freshmenCount = gisOverview?.freshmenCount ?? processedStudents.filter((s) => s.admissionType === "Freshman").length;
    const transfereeCount = gisOverview?.transfereeCount ?? processedStudents.filter((s) => s.admissionType === "Transferee").length;

    return {
      totalStudentsSynced,
      freshmenCount: freshmenCount > 0 ? String(freshmenCount) : processedStudents.length === 0 ? "—" : String(freshmenCount),
      transfereeCount: transfereeCount > 0 ? String(transfereeCount) : processedStudents.length === 0 ? "—" : String(transfereeCount),
      verifiedSchools,
      unmappedSchools,
      apiSyncStatus: schoolsLoading ? "Loading registry…" : processedStudents.length > 0 ? "Synced · GIS pipeline" : "Idle · connect API in Settings",
    };
  }, [schools, schoolsLoading, gisOverview, processedStudents]);

  const queueSchools = useMemo(
    () =>
      [...schools]
        .filter(
          (s) =>
            !hasCoordinates(s) ||
            duplicateIds.has(s.id) ||
            s.status === "Needs Review" ||
            s.status === "Missing Coordinates",
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [schools, duplicateIds],
  );

  const studentsSorted = useMemo(
    () => [...processedStudents].sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime()),
    [processedStudents],
  );

  function mappingStatusLabel(status: string) {
    if (status === "verified") return "Verified";
    if (status === "mapped") return "Mapped";
    if (status === "needs_review") return "Needs review";
    return "Pending";
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50/95">
      <Tabs
        value={section}
        onValueChange={(v) => onSectionChange(v as AdminPortalSection)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <header className="shrink-0 border-b border-slate-200/90 bg-white px-3 py-2.5 sm:px-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-900 text-[10px] font-bold tracking-tight text-white">
                  GIS
                </div>
                <div>
                  <h2 className="truncate text-[15px] font-semibold leading-tight text-slate-900">
                    GIS Student Mapping · Admin
                  </h2>
                  <p className="truncate text-[11px] text-slate-500">Feeder mapping workspace · map stays primary</p>
                </div>
              </div>
            </div>
            <TabsList
              className={cn(
                "flex h-auto w-full flex-wrap justify-start gap-0.5 rounded-lg bg-slate-100 p-1",
                "lg:inline-flex lg:h-9 lg:w-auto lg:flex-nowrap",
              )}
            >
              {SECTION_TABS.map(({ value, label, short }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm sm:px-3"
                >
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </header>

        <TabsContent value="overview" className="m-0 mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatMini
                  title="Total students synced"
                  value={overview.totalStudentsSynced.toLocaleString()}
                  icon={<GraduationCap className="h-3.5 w-3.5" />}
                />
                <StatMini title="Freshmen" value={overview.freshmenCount} sub="SHS → Frosh when API connected" icon={<UserCircle2 className="h-3.5 w-3.5" />} />
                <StatMini title="Transferees" value={overview.transfereeCount} sub="College → xfer when API connected" icon={<ArrowRightLeft className="h-3.5 w-3.5" />} />
                <StatMini title="Verified schools" value={String(overview.verifiedSchools)} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
                <StatMini title="Unmapped schools" value={String(overview.unmappedSchools)} warn={overview.unmappedSchools > 0} icon={<MapPinned className="h-3.5 w-3.5" />} />
                <StatMini title="API sync status" value={overview.apiSyncStatus} icon={<CloudOff className="h-3.5 w-3.5" />} />
                <StatMini title="Last sync" value={formatSyncTime(schoolsUpdatedAt)} sub="Registry data refresh" icon={<Clock3 className="h-3.5 w-3.5" />} />
              </div>
              <Card className="border-slate-200/90 shadow-none">
                <CardHeader className="space-y-1 pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <GitBranch className="h-4 w-4 text-slate-600" />
                    School matching pipeline
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    API / Excel / Sheets → students_raw → students_processed → school_aliases → schools registry → GIS
                    aggregation → map. Names normalize; aliases dedupe; verified coordinates reuse.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="feed" className="m-0 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4">
            <p className="mb-2 shrink-0 text-[11px] text-slate-500">
              Live rows appear here when the admissions API is connected. Classification: Senior High → Freshman, College →
              Transferee.
            </p>
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-slate-200/90 shadow-sm">
              <CardHeader className="shrink-0 border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-semibold">Live student feed</CardTitle>
              </CardHeader>
              <div className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(241_245_249)]">
                    <TableRow className="hover:bg-transparent">
                      {[
                        "Student #",
                        "Full name",
                        "Course",
                        "Admission",
                        "Last school",
                        "School type",
                        "Mapping",
                        "Synced",
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className={cn(
                            "h-9 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-slate-600",
                            (h === "Last school" || h === "School type" || h === "Synced") && "hidden lg:table-cell",
                            h === "Course" && "hidden md:table-cell",
                          )}
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsSorted.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-xs text-slate-500">
                          No students yet. Configure API sync under Settings.
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentsSorted.map((st) => {
                        const { enrollmentYear, sequenceNumber } = parseStudentNumberTag(st.studentNumber);
                        const admission = formatAdmissionLabel(
                          st.admissionType as "Freshman" | "Transferee" | null,
                        );
                        return (
                          <TableRow key={st.id} className="text-xs">
                            <TableCell className="align-top font-mono text-[11px]">
                              {st.studentNumber}
                              {enrollmentYear != null && sequenceNumber != null ? (
                                <p className="mt-0.5 font-sans text-[10px] text-slate-400">
                                  {enrollmentYear} · seq {sequenceNumber}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="align-top font-medium">{st.fullName}</TableCell>
                            <TableCell className="hidden align-top md:table-cell">{st.course || "—"}</TableCell>
                            <TableCell className="align-top">
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {admission}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden max-w-[160px] truncate align-top lg:table-cell" title={st.lastSchoolName}>
                              {st.lastSchoolName}
                            </TableCell>
                            <TableCell className="hidden align-top lg:table-cell">{st.lastSchoolType || "—"}</TableCell>
                            <TableCell className="align-top">
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {mappingStatusLabel(st.mappingStatus)}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden whitespace-nowrap align-top text-slate-500 lg:table-cell">
                              {formatSyncTime(new Date(st.syncedAt).getTime())}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queue" className="m-0 mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-4xl space-y-3 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">
                  Unknown schools, low-confidence matches, and missing coordinates. Verify, pin, approve, or merge.
                </p>
                <Button size="sm" className="h-8 text-xs" onClick={onAddSchool}>
                  Add school
                </Button>
              </div>
              {queueSchools.length === 0 ? (
                <Card className="border-slate-200/90 shadow-none">
                  <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
                    <p className="text-sm font-medium text-slate-700">Queue is clear</p>
                    <p className="text-xs text-slate-500">No schools need review or coordinates.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden border-slate-200/90 shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold uppercase">School</TableHead>
                        <TableHead className="hidden text-[10px] font-semibold uppercase sm:table-cell">Issue</TableHead>
                        <TableHead className="text-right text-[10px] font-semibold uppercase">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueSchools.map((s) => (
                        <TableRow key={s.id} className="text-xs">
                          <TableCell>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {s.municipality} · {s.institutionType}
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
                              {s.status === "Needs Review" ? (
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
        </TabsContent>

        <TabsContent value="registry" className="m-0 mt-0 min-h-0 flex-1 bg-slate-50 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="p-3 sm:p-4">{renderSchoolRegistry()}</div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="import-logs" className="m-0 mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-4xl p-3 sm:p-4">
              <Card className="border-slate-200/90 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Import & sync history</CardTitle>
                  <CardDescription className="text-xs">API runs and GIS pipeline sync history.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold uppercase">Time</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase">Source</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase">Imported</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase">Failed</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center">
                            <AlertCircle className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                            <p className="text-xs font-medium text-slate-700">No sync runs logged yet</p>
                            <p className="mt-1 text-[11px] text-slate-500">Run a sync from Settings to populate this table.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        importLogs.map((log) => (
                          <TableRow key={log.id} className="text-xs">
                            <TableCell className="whitespace-nowrap">
                              {formatSyncTime(new Date(log.startedAt).getTime())}
                            </TableCell>
                            <TableCell>{log.source}</TableCell>
                            <TableCell className="tabular-nums">{log.importedCount}</TableCell>
                            <TableCell className="tabular-nums">{log.failedCount}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {log.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="m-0 mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-5xl space-y-5 p-3 sm:p-4">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  API · Sheets · file upload
                </h3>
                <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-4">
                  {renderIntegrationControls()}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">GIS map defaults</h3>
                {renderGisWorkspaceSettings()}
              </section>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatMini({
  title,
  value,
  sub,
  icon,
  warn,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  warn?: boolean;
}) {
  return (
    <Card className={cn("border border-slate-200/90 shadow-none", warn && "border-amber-100 bg-amber-50/50")}>
      <CardContent className="flex gap-2 p-3">
        <span className="mt-0.5 text-slate-400">{icon}</span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="truncate text-sm font-semibold tabular-nums text-slate-900">{value}</p>
          {sub ? <p className="truncate text-[10px] text-slate-400">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
