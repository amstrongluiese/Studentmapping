import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Settings, CheckCircle2, CloudCog, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UnmatchedSchoolsQueue } from "./UnmatchedSchoolsQueue";
import { useSchools } from "@/hooks/use-schools";

export function ApiSettingsCenter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: schools = [] } = useSchools();

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsToken, setSheetsToken] = useState("");

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
      toast({ title: "Success", description: "Settings saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    }
  });

  const syncSheetsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/integrations/sync-google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetsUrl, sheetsToken })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to sync");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Sync Started", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/imports/staging"] });
    },
    onError: (err: any) => {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    }
  });

  const { data: diagnostics, isLoading: isLoadingDiag } = useQuery<any>({
    queryKey: ["/api/settings/diagnostics"],
  });

  const { data: stagingRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/imports/staging"],
  });

  const unmatchedNames = Array.from(new Set(
    stagingRecords
      .filter((r: any) => r.importStatus === "Unmatched")
      .map((r: any) => r.previousSchool)
      .filter(Boolean)
  )) as string[];

  const manualMatches = {}; // Local state or resolved matches placeholder

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
      toast({ title: "Success", description: "Match resolution and self-learning rules applied." });
    },
  });

  const applyToGis = async () => {
    if (unmatchedNames.length > 0) {
      toast({ title: "GIS Validation Failed", description: `${unmatchedNames.length} unmatched schools require review before syncing to GIS.`, variant: "destructive" });
      return;
    }
    
    try {
      const res = await fetch("/api/imports/apply", { method: "POST" });
      const data = await res.json();
      toast({ title: "Success", description: `Applied ${data.appliedCount} records to GIS map.` });
      queryClient.invalidateQueries();
    } catch (e) {
      toast({ title: "Error", description: "Failed to apply to GIS", variant: "destructive" });
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc]">
      <div className="p-6 border-b bg-white flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-600" />
            API Settings Center V2
          </h2>
          <p className="text-sm text-slate-500 mt-1">Control center for data ingestion, tracking, and GIS synchronization</p>
        </div>
        <Button onClick={applyToGis} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          Apply Mapped To GIS
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="sheets" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-6 lg:w-[800px] bg-slate-100 p-1">
            <TabsTrigger value="sheets" className="text-xs">Google Sheets / API</TabsTrigger>
            <TabsTrigger value="manual" className="text-xs">Manual Upload</TabsTrigger>
            <TabsTrigger value="unmatched" className="text-xs relative">
              Unmatched 
              {unmatchedNames.length > 0 && (
                <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {unmatchedNames.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="alias" className="text-xs">Alias Manager</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">Import Logs</TabsTrigger>
            <TabsTrigger value="diagnostics" className="text-xs">Diagnostics</TabsTrigger>
          </TabsList>

          <TabsContent value="sheets" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CloudCog className="h-5 w-5"/> API & Google Sheets</CardTitle>
                <CardDescription>Connect remote spreadsheets or JSON endpoints to ingest students automatically via GET.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Source URL (GET)</label>
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
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline"
                    onClick={() => saveSettingsMutation.mutate({ sheetsUrl, sheetsToken })}
                    disabled={saveSettingsMutation.isPending}
                  >
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Config"}
                  </Button>
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => syncSheetsMutation.mutate()}
                    disabled={syncSheetsMutation.isPending || !sheetsUrl}
                  >
                    {syncSheetsMutation.isPending ? "Syncing..." : "Sync Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Manual Upload</CardTitle>
                <CardDescription>Upload Excel, CSV, or JSON directly.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-500">
                  <Table className="h-8 w-8 mb-2 text-slate-400" />
                  <p>Drag and drop files here to upload instantly to Staging.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unmatched" className="m-0">
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

          <TabsContent value="alias" className="m-0">
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

          <TabsContent value="logs" className="m-0">
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

          <TabsContent value="diagnostics" className="m-0">
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
        </Tabs>
      </div>
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
