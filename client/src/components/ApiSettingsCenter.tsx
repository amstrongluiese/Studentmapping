import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Settings, CheckCircle2, CloudCog, Table as TableIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnmatchedSchoolsQueue } from "./UnmatchedSchoolsQueue";
import { useSchools } from "@/hooks/use-schools";
import { useToast } from "@/hooks/use-toast";

export function ApiSettingsCenter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: schools = [] } = useSchools();

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  const [activeTab, setActiveTab] = useState("sheets");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsToken, setSheetsToken] = useState("");
  
  // Notification states
  const [syncNotification, setSyncNotification] = useState<{ type: "success"|"error", message: string } | null>(null);

  // Preview Data State
  const [previewData, setPreviewData] = useState<{ fields: string[], records: any[] } | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 50;

  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    studentNumber: "",
    fullName: "",
    previousSchool: "",
    strand: "",
    program: "",
    scholarship: "",
    municipality: "",
  });

  useEffect(() => {
    if (settings) {
      if (settings.sheetsUrl) setSheetsUrl(settings.sheetsUrl);
      if (settings.sheetsToken) setSheetsToken(settings.sheetsToken);
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      setSyncNotification({ type: "success", message: "Settings saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (err: any) => {
      setSyncNotification({ type: "error", message: err.message || "Failed to save settings." });
    }
  });

  const fetchPreviewMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        sourceType: "googleSheets",
        url: sheetsUrl,
        method: "GET",
        authMode: sheetsToken ? "bearer" : "none",
        authToken: sheetsToken,
      };
      const res = await fetch("/api/integrations/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to fetch Google Sheet data.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setSyncNotification(null);
      // Try to auto-guess mapping
      const guessed: Record<string, string> = { ...columnMapping };
      const findField = (possibilities: string[]) => data.fields.find((f: string) => possibilities.some(p => f.toLowerCase().includes(p))) || "";
      guessed.studentNumber = findField(["student id", "student no", "student_number", "id"]);
      guessed.fullName = findField(["name", "full name", "fullname", "student name", "student_name"]);
      guessed.previousSchool = findField(["school", "previous", "graduated", "feeder"]);
      guessed.strand = findField(["strand", "track", "previous school info"]);
      guessed.program = findField(["program", "course", "strand", "degree"]);
      guessed.scholarship = findField(["scholarship", "iskolar", "grant"]);
      guessed.municipality = findField(["municipality", "city", "town", "address"]);
      
      setPreviewPage(1);
      
      setColumnMapping(guessed);
      setActiveTab("imported");
    },
    onError: (err: any) => {
      setSyncNotification({ type: "error", message: err.message || "Failed to fetch data." });
    }
  });

  const importToStagingMutation = useMutation({
    mutationFn: async () => {
      if (!previewData) throw new Error("No data to import.");
      
      const mappedRecords = previewData.records.map((r: any) => ({
        studentNumber: r[columnMapping.studentNumber],
        fullName: r[columnMapping.fullName],
        previousSchool: r[columnMapping.previousSchool],
        strand: r[columnMapping.strand],
        program: r[columnMapping.program],
        scholarship: r[columnMapping.scholarship],
        municipality: r[columnMapping.municipality],
        importSource: "Google Sheets",
      }));

      const startRes = await fetch("/api/imports/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalRecords: mappedRecords.length })
      });
      if (!startRes.ok) throw new Error("Failed to start import session.");

      const batchRes = await fetch("/api/imports/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: mappedRecords })
      });
      if (!batchRes.ok) throw new Error("Failed to process batch.");
      
      return mappedRecords.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Import Started",
        description: `Successfully queued ${count} records for importing.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/imports/staging"] });
      queryClient.invalidateQueries({ queryKey: ["/api/imports/progress"] });
      
      // Switch to unmatched queue if there's an active matching session running
      setTimeout(() => {
        setActiveTab("unmatched");
      }, 1500);
    },
    onError: (err: any) => {
      toast({
        title: "Import Failed",
        description: err.message || "Failed to import data.",
        variant: "destructive",
      });
    }
  });

  const { data: diagnostics, isLoading: isLoadingDiag } = useQuery<any>({
    queryKey: ["/api/settings/diagnostics"],
  });

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

  const manualMatches = {};

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

  const applyToGis = async () => {
    try {
      const res = await fetch("/api/imports/apply", { method: "POST" });
      const data = await res.json();
      toast({
        title: "Success",
        description: `Mapped ${data.appliedCount} students successfully.`,
      });
      queryClient.invalidateQueries();
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to map students.",
        variant: "destructive",
      });
    }
  };

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/clear-data", { method: "POST" });
      if (!res.ok) throw new Error("Failed to clear data");
      return res.json();
    },
    onSuccess: () => {
      alert("All imported data and student records have been cleared.");
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      alert(err.message || "Failed to clear data");
    }
  });

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear ALL imported data and student records? This cannot be undone!")) {
      clearDataMutation.mutate();
    }
  };

  const handleMappingChange = (field: string, value: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc] p-4 overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-start gap-4 mb-4 shrink-0 bg-white/40 p-2 rounded-xl border border-white/60 shadow-sm backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-start gap-2 shrink-0">
            <Button 
              onClick={handleClearData} 
              disabled={clearDataMutation.isPending}
              variant="outline"
              className="border-rose-200 bg-white/80 text-rose-600 hover:bg-rose-50 hover:text-rose-700 shadow-sm h-9 text-xs transition-colors"
            >
              {clearDataMutation.isPending ? "Clearing..." : "Factory Reset"}
            </Button>
            
            <Button 
              onClick={() => importToStagingMutation.mutate()} 
              disabled={importToStagingMutation.isPending || !previewData}
              className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm h-9 text-xs transition-colors"
            >
              {importToStagingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "1. Import Data"
              )}
            </Button>

            <Button 
              onClick={applyToGis} 
              disabled={stagingRecords.length === 0 || importProgress?.isProcessing}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm h-9 text-xs transition-colors"
            >
              {importProgress?.isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mapping ({importProgress.percentage || 0}%)...
                </>
              ) : (
                "2. Map Students"
              )}
            </Button>
          </div>

          <TabsList className="flex flex-wrap w-full lg:max-w-fit h-auto bg-transparent gap-1 justify-start">
            <TabsTrigger value="sheets" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">Google Sheets</TabsTrigger>
            <TabsTrigger value="manual" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">Manual Upload</TabsTrigger>
            <TabsTrigger value="alignment" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">Column Alignment</TabsTrigger>
            <TabsTrigger value="imported" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">Imported Table</TabsTrigger>
            <TabsTrigger value="unmatched" className="text-xs rounded-lg relative data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">
              Unmatched 
              {unmatchedNames.length > 0 && (
                <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {unmatchedNames.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="alias" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">Alias Manager</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">Import Logs</TabsTrigger>
            <TabsTrigger value="diagnostics" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">Diagnostics</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="sheets" className="m-0 h-full overflow-auto pb-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CloudCog className="h-5 w-5"/> Google Sheets Linkage</CardTitle>
                <CardDescription>Connect remote spreadsheets to ingest students automatically.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {syncNotification && (
                  <div className={`p-4 rounded-md flex items-start gap-3 ${syncNotification.type === 'error' ? 'bg-red-50 text-red-900 border border-red-200' : 'bg-green-50 text-green-900 border border-green-200'}`}>
                    {syncNotification.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />}
                    <div>
                      <h4 className="font-semibold text-sm">{syncNotification.type === 'error' ? "Error" : "Success"}</h4>
                      <p className="text-sm opacity-90">{syncNotification.message}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Source URL (Google Sheet)</label>
                  <Input 
                    placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" 
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Authentication Token (Optional)</label>
                  <Input 
                    type="password" 
                    placeholder="Bearer ..." 
                    value={sheetsToken}
                    onChange={(e) => setSheetsToken(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 mt-4 items-center">
                  <Button 
                    variant="outline"
                    onClick={() => saveSettingsMutation.mutate({ sheetsUrl, sheetsToken })}
                    disabled={saveSettingsMutation.isPending}
                  >
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Config"}
                  </Button>
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => fetchPreviewMutation.mutate()}
                    disabled={fetchPreviewMutation.isPending || !sheetsUrl}
                  >
                    {fetchPreviewMutation.isPending ? "Fetching..." : "Fetch Sheet Data"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="alignment" className="m-0 h-full overflow-auto pb-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Column Alignment</span>
                  <Button 
                    onClick={() => importToStagingMutation.mutate()} 
                    disabled={!previewData || importToStagingMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {importToStagingMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      "Import Data"
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>Align Google Sheet columns with standard fields before importing.</CardDescription>
              </CardHeader>
              <CardContent>
                {!previewData ? (
                  <div className="p-8 text-center text-slate-500 border-2 border-dashed rounded-md">
                    No data imported yet. Please fetch data from the Google Sheets tab first.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-100">
                      {[
                        { key: "studentNumber", label: "Student Number" },
                        { key: "fullName", label: "Full Name" },
                        { key: "previousSchool", label: "Previous School" },
                        { key: "strand", label: "Strand / Previous Info" },
                        { key: "program", label: "Program/Course" },
                        { key: "scholarship", label: "Scholarship" },
                        { key: "municipality", label: "Municipality" }
                      ].map(field => (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">{field.label}</label>
                          <Select 
                            value={columnMapping[field.key] || ""} 
                            onValueChange={(val) => handleMappingChange(field.key, val)}
                          >
                            <SelectTrigger className="w-full bg-white h-8 text-xs">
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- Skip --</SelectItem>
                              {previewData.fields.map(f => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="imported" className="m-0 flex-1 min-h-0 flex flex-col -mx-4 -mb-4">
            {!previewData ? (
              <div className="p-8 m-4 text-center text-slate-500 border-2 border-dashed rounded-md mt-4">
                No data imported yet. Please fetch data from the Google Sheets tab first.
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <Table className="relative w-full border-collapse">
                  <TableHeader className="bg-slate-100/80 backdrop-blur-md sticky top-0 z-10">
                    <TableRow>
                      {previewData.fields.map((field) => (
                        <TableHead key={field} className="whitespace-nowrap font-medium text-xs">
                          {field}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.records.map((record, i) => (
                      <TableRow key={i}>
                        {previewData.fields.map((field) => (
                          <TableCell key={field} className="whitespace-nowrap text-xs py-2">
                            {record[field] !== undefined ? String(record[field]) : ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="m-0 h-full overflow-auto pb-4">
            <Card>
              <CardHeader>
                <CardTitle>Manual Upload</CardTitle>
                <CardDescription>Upload Excel, CSV, or JSON directly.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-500">
                  <TableIcon className="h-8 w-8 mb-2 text-slate-400" />
                  <p>Drag and drop files here to upload instantly to Staging.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unmatched" className="m-0 flex-1 min-h-0 flex flex-col pb-4 mt-4">
            <UnmatchedSchoolsQueue 
              unmatchedSchoolNames={unmatchedNames}
              manualMatches={manualMatches}
              existingSchools={schools}
              onResolveMatch={(importedName, school) => {
                if (school) {
                  resolveMatchMutation.mutate({ importedName, officialSchoolId: school.id, createAlias: true });
                }
              }}
            />
          </TabsContent>

          <TabsContent value="alias" className="m-0 h-full overflow-auto pb-4">
            <Card>
              <CardHeader>
                <CardTitle>Alias Manager</CardTitle>
                <CardDescription>Manage alternate names for official schools.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">The Alias Manager table is populated from the Self-Learning engine when you resolve Unmatched Schools.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="m-0 h-full overflow-auto pb-4">
            <Card>
              <CardHeader>
                <CardTitle>Import Logs</CardTitle>
                <CardDescription>History of all import runs.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">Import logs from the /api/imports/logs endpoint will appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnostics" className="m-0 h-full overflow-auto pb-4">
            <Card>
              <CardHeader>
                <CardTitle>System Diagnostics</CardTitle>
                <CardDescription>High level overview of the matching engine.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDiag ? (
                  <div className="text-sm text-slate-500">Loading diagnostics...</div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <DiagCard label="School Registry" value={diagnostics?.schoolRegistryCount || 0} />
                    <DiagCard label="Saved Aliases" value={diagnostics?.aliasCount || 0} />
                    <DiagCard label="Matched Records" value={diagnostics?.matchedRecords || 0} />
                    <DiagCard label="Unmatched Records" value={diagnostics?.unmatchedRecords || 0} />
                    <DiagCard label="Applied to GIS" value={diagnostics?.appliedRecords || 0} />
                    <DiagCard label="Import Success Rate" value={`${diagnostics?.importSuccessRate || 0}%`} />
                    <DiagCard label="Avg Confidence" value={`${diagnostics?.averageConfidence || 0}%`} />
                    <DiagCard label="System Health" value={diagnostics?.systemHealth || "Optimal"} highlight />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function DiagCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${highlight ? 'text-indigo-600' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-2xl font-black mt-1 ${highlight ? 'text-indigo-900' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

