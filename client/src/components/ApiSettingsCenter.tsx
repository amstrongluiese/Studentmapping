import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, CloudCog, Loader2, RefreshCcw, HardDriveDownload, Layers, Radio, Zap, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function ApiSettingsCenter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  const { data: importProgress } = useQuery<any>({
    queryKey: ["/api/imports/progress"],
    refetchInterval: (query) => query.state.data?.isProcessing ? 500 : 3000,
  });

  const { data: lastBatch, refetch: refetchLastBatch } = useQuery<any>({
    queryKey: ["/api/integrations/last-batch"],
  });

  const [activeTab, setActiveTab] = useState("sheets");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsToken, setSheetsToken] = useState("");
  const [syncMode, setSyncMode] = useState<"live" | "staging">("staging");
  
  // Notification states
  const [syncNotification, setSyncNotification] = useState<{ type: "success"|"error", message: string } | null>(null);
  
  // Track if a sync was started in this session
  const [syncStarted, setSyncStarted] = useState(false);

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
      toast({ title: "Settings Saved", description: "Google Sheets configuration saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    }
  });

  const syncV2Mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        sheetsUrl,
        sheetsToken,
        syncMode,
      };
      const res = await fetch("/api/integrations/sync-google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to trigger auto-sync.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSyncNotification({ type: "success", message: data.message || "Auto-sync started successfully." });
      toast({
        title: syncMode === "staging" ? "Batch Staged Successfully" : "Live Sync Started",
        description: data.message,
      });
      refetchLastBatch();
      queryClient.invalidateQueries({ queryKey: ["/api/students/processed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gis/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/imports/logs"] });
    },
    onError: (err: any) => {
      setSyncNotification({ type: "error", message: err.message || "Failed to sync." });
    }
  });

  const applyBatchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/integrations/apply-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to apply batch.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Live Mapping Committed!",
        description: data.message || "Batch committed to live production map.",
      });
      refetchLastBatch();
      queryClient.invalidateQueries({ queryKey: ["/api/students/processed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gis/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schoolRegistry"] });
    },
    onError: (err: any) => {
      toast({ title: "Apply Failed", description: err.message, variant: "destructive" });
    }
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/clear-data", { method: "POST" });
      if (!res.ok) throw new Error("Failed to clear data");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Data Reset Complete", description: "All student records and staging logs have been completely reset." });
      queryClient.resetQueries();
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    }
  });

  const archiveDataMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/archive-data", { method: "POST" });
      if (!res.ok) throw new Error("Failed to archive data");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Data Archived", description: "All active student records have been moved to the Archives tab." });
      queryClient.resetQueries();
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast({ title: "Archive Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleClearData = () => {
    if (confirm("Are you sure you want to FACTORY RESET all student records, staging data, and import logs? This cannot be undone!")) {
      clearDataMutation.mutate();
    }
  };

  const handleArchiveData = () => {
    if (confirm("Archive all active student data? Records will be moved to the Archives tab.")) {
      archiveDataMutation.mutate();
    }
  };

  const isBatchApplied = lastBatch?.status === "applied";

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-hidden bg-transparent">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-center gap-4 mb-4 shrink-0 px-1">
          <TabsList className="inline-flex w-fit max-w-full flex-wrap h-11 bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl p-1 gap-1 justify-center items-center shadow-sm">
            <TabsTrigger value="sheets" className="flex-none text-sm px-4 rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 font-medium">Google Sheets Sync</TabsTrigger>
            <TabsTrigger value="alias" className="flex-none text-sm px-4 rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 font-medium">Alias Manager</TabsTrigger>
            <TabsTrigger value="system" className="flex-none text-sm px-4 rounded-lg data-[state=active]:bg-rose-50 data-[state=active]:shadow-sm data-[state=active]:text-rose-700 font-medium text-slate-500">System Maintenance</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-1 space-y-6">
          {/* Google Sheets Tab */}
          <TabsContent value="sheets" className="m-0 h-full overflow-auto pb-6 space-y-6">
            <Card className="max-w-3xl mx-auto shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <CloudCog className="h-5 w-5"/> 
                  Automated Data Import (V2)
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Connect your Google Spreadsheet to ingest, map, and geocode student admissions data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {syncNotification && (
                  <div className={`p-4 rounded-lg flex items-start gap-3 border ${syncNotification.type === 'error' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}`}>
                    {syncNotification.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />}
                    <div>
                      <h4 className="font-semibold text-sm">{syncNotification.type === 'error' ? "Error" : "Sync Initiated"}</h4>
                      <p className="text-sm opacity-90">{syncNotification.message}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Source URL (Google Sheet)</label>
                    <Input 
                      placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" 
                      value={sheetsUrl}
                      onChange={(e) => setSheetsUrl(e.target.value)}
                      className="bg-slate-50 focus-visible:ring-indigo-500"
                    />
                    <p className="text-xs text-slate-400">Must be a publicly accessible CSV sheet link or include an auth token.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Authentication Token (Optional)</label>
                    <Input 
                      type="password" 
                      placeholder="Bearer ..." 
                      value={sheetsToken}
                      onChange={(e) => setSheetsToken(e.target.value)}
                      className="bg-slate-50 focus-visible:ring-indigo-500"
                    />
                  </div>

                  {/* Compact Sync Mode Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sync Execution Mode</div>
                      <div className="text-xs text-slate-600">Choose Staging Mode (batch review) or Live Direct Mode (instant map publish).</div>
                    </div>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
                      <button
                        type="button"
                        onClick={() => setSyncMode("staging")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                          syncMode === "staging" ? "bg-amber-500 text-white shadow-sm font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Staging Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => setSyncMode("live")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                          syncMode === "live" ? "bg-indigo-600 text-white shadow-sm font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Live Direct
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  {importProgress?.isProcessing ? (
                    <div className="w-full space-y-3 p-4 border border-indigo-100 bg-indigo-50/50 rounded-lg">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-indigo-700">Processing Batch...</span>
                        <span className="font-bold text-indigo-900">{importProgress.percentage || 0}%</span>
                      </div>
                      <Progress value={importProgress.percentage || 0} className="h-2 bg-indigo-200" />
                      <p className="text-xs text-indigo-600">Processed {importProgress.processed || 0} of {importProgress.total || 0} records.</p>
                    </div>
                  ) : syncStarted && importProgress?.total > 0 && importProgress?.processed === importProgress?.total ? (
                    <div className="w-full space-y-4 p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold text-emerald-800">Done! All {importProgress.total} records ingested into batch.</span>
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-slate-600 hover:text-slate-900 border-slate-300"
                          onClick={() => setSyncStarted(false)}
                        >
                          Fetch another batch
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      className="w-[210px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-10 rounded-lg shadow-sm shrink-0 justify-center"
                      onClick={() => {
                        setSyncStarted(true);
                        saveSettingsMutation.mutate({ sheetsUrl, sheetsToken });
                        syncV2Mutation.mutate();
                      }}
                      disabled={syncV2Mutation.isPending || !sheetsUrl}
                    >
                      {syncV2Mutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching...</>
                      ) : syncMode === "staging" ? (
                        <><Clock className="mr-2 h-4 w-4 text-amber-300" /> Fetch & Stage Batch</>
                      ) : (
                        <><Zap className="mr-2 h-4 w-4 text-amber-300" /> Fetch & Publish Direct</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* LIVE MAPPING CONTROLLER & BATCH MEMORY TRACKER */}
            <Card className="max-w-3xl mx-auto shadow-sm border-border/60 bg-card/70 backdrop-blur-md">
              <CardHeader className="border-b border-border/40 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                    <Radio className="h-5 w-5 text-emerald-500 animate-pulse" />
                    Live GIS Mapping Feed &amp; Batch Memory Controller
                  </CardTitle>
                  <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-1 w-fit", isBatchApplied ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30")}>
                    {isBatchApplied ? "Live Mapping Active" : "Staged Batch Pending Approval"}
                  </Badge>
                </div>
                <CardDescription className="text-muted-foreground">
                  Control batch commits to the production GIS map. Remember and apply the last ingested batch.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Batch Tracker Details */}
                <div className="p-4 bg-muted/40 rounded-xl border border-border/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Batch Memory:</span>
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {lastBatch?.batchId || "BATCH-INITIAL"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {lastBatch?.totalRecords || 0} Student Records in Batch
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fetched: {lastBatch?.fetchedAt ? new Date(lastBatch.fetchedAt).toLocaleString() : "N/A"}
                      {lastBatch?.appliedAt ? ` • Applied: ${new Date(lastBatch.appliedAt).toLocaleString()}` : ""}
                    </p>
                  </div>

                  <Button
                    onClick={() => applyBatchMutation.mutate()}
                    disabled={applyBatchMutation.isPending || isBatchApplied}
                    className={cn(
                      "shrink-0 h-11 px-6 font-semibold shadow-md gap-2 transition-all",
                      isBatchApplied 
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-default" 
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25"
                    )}
                  >
                    {applyBatchMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Committing Batch...</>
                    ) : isBatchApplied ? (
                      <><ShieldCheck className="h-4 w-4 text-emerald-500" /> Batch Live & Committed</>
                    ) : (
                      <><Layers className="h-4 w-4" /> Apply Batch to Live Mapping</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alias Manager Tab */}
          <TabsContent value="alias" className="m-0 h-full overflow-auto pb-4">
            <Card className="max-w-3xl mx-auto shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <CardTitle className="text-slate-800">Alias Manager</CardTitle>
                <CardDescription>Manage alternate names for official schools. The mapping engine uses this dictionary to auto-correct typos.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  The Alias Manager is populated automatically from the Self-Learning engine when you resolve Unmatched Schools in the main dashboard.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Maintenance Tab */}
          <TabsContent value="system" className="m-0 h-full overflow-auto pb-4">
            <Card className="max-w-3xl mx-auto shadow-sm border-amber-200 bg-amber-50/20">
              <CardHeader className="border-b border-amber-100 pb-4">
                <CardTitle className="text-amber-800 flex items-center gap-2">
                  <HardDriveDownload className="h-5 w-5 text-amber-600" />
                  Data Archiving & Maintenance
                </CardTitle>
                <CardDescription className="text-slate-600">Archive current student datasets or execute factory data resets before starting a new Google Sheet link.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div>
                    <h4 className="font-semibold text-slate-800">Archive Current Dataset</h4>
                    <p className="text-sm text-slate-500">Move all active student records into the Archives folder. Keeps student history safe for future retrieval.</p>
                  </div>
                  <Button 
                    onClick={handleArchiveData} 
                    disabled={archiveDataMutation.isPending}
                    variant="outline"
                    className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    {archiveDataMutation.isPending ? "Archiving..." : "Archive All Data"}
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-rose-200 shadow-sm">
                  <div>
                    <h4 className="font-semibold text-rose-800">Factory Reset (Full Data Purge)</h4>
                    <p className="text-sm text-slate-500">Permanently delete all imported student records, GIS staging data, and import logs to start completely fresh.</p>
                  </div>
                  <Button 
                    onClick={handleClearData} 
                    disabled={clearDataMutation.isPending}
                    variant="destructive"
                    className="shrink-0 bg-rose-600 hover:bg-rose-700"
                  >
                    {clearDataMutation.isPending ? "Clearing..." : "Reset All Data"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
