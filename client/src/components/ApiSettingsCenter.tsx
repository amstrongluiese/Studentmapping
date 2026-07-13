import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, CloudCog, Loader2, RefreshCcw, HardDriveDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

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

  const [activeTab, setActiveTab] = useState("sheets");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsToken, setSheetsToken] = useState("");
  
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
        title: "Sync Started",
        description: data.message,
      });
      // Invalidate relevant queries so the UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/students/processed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gis/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/imports/logs"] });
    },
    onError: (err: any) => {
      setSyncNotification({ type: "error", message: err.message || "Failed to sync." });
    }
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/clear-data", { method: "POST" });
      if (!res.ok) throw new Error("Failed to clear data");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Data Cleared", description: "All imported data has been factory reset." });
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear ALL imported data and student records? This cannot be undone!")) {
      clearDataMutation.mutate();
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-hidden bg-transparent">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-start gap-4 mb-4 shrink-0 px-1">
          <TabsList className="inline-flex w-fit max-w-full flex-wrap h-11 bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl p-1 gap-1 justify-start items-center shadow-sm">
            <TabsTrigger value="sheets" className="flex-none text-sm px-4 rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 font-medium">Google Sheets Sync</TabsTrigger>
            <TabsTrigger value="alias" className="flex-none text-sm px-4 rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 font-medium">Alias Manager</TabsTrigger>
            <TabsTrigger value="system" className="flex-none text-sm px-4 rounded-lg data-[state=active]:bg-rose-50 data-[state=active]:shadow-sm data-[state=active]:text-rose-700 font-medium text-slate-500">System Maintenance</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-1">
          {/* Google Sheets Tab */}
          <TabsContent value="sheets" className="m-0 h-full overflow-auto pb-4">
            <Card className="max-w-3xl shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <CloudCog className="h-5 w-5"/> 
                  Automated Data Import (V2)
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Connect your Google Spreadsheet to automatically ingest, map, and geocode student records in one click.
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
                    <p className="text-xs text-slate-400">Must be a publicly accessible sheet or provide an auth token.</p>
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
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  {importProgress?.isProcessing ? (
                    <div className="space-y-3 p-4 border border-indigo-100 bg-indigo-50/50 rounded-lg">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-indigo-700">Step 2: AI Mapping and Geocoding...</span>
                        <span className="font-bold text-indigo-900">{importProgress.percentage || 0}%</span>
                      </div>
                      <Progress value={importProgress.percentage || 0} className="h-2 bg-indigo-200" />
                      <p className="text-xs text-indigo-600">Processed {importProgress.processed || 0} of {importProgress.total || 0} records.</p>
                    </div>
                  ) : syncStarted && importProgress?.total > 0 && importProgress?.processed === importProgress?.total ? (
                    <div className="space-y-4 p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold text-emerald-800">Step 3: Done! All {importProgress.total} records processed.</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          className="w-full bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-sm"
                          onClick={() => {
                            queryClient.invalidateQueries();
                            document.querySelector<HTMLButtonElement>('[data-tab-id="feed"]')?.click();
                          }}
                        >
                          View Imported Data in Live Feed
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full text-slate-500 hover:text-slate-700 h-8 text-xs"
                          onClick={() => setSyncStarted(false)}
                        >
                          Start another sync
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-11"
                      onClick={() => {
                        setSyncStarted(true);
                        saveSettingsMutation.mutate({ sheetsUrl, sheetsToken });
                        syncV2Mutation.mutate();
                      }}
                      disabled={syncV2Mutation.isPending || !sheetsUrl}
                    >
                      {syncV2Mutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Step 1: Fetching and parsing data...</>
                      ) : (
                        <><RefreshCcw className="mr-2 h-4 w-4" /> Fetch & Auto-Sync</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alias Manager Tab */}
          <TabsContent value="alias" className="m-0 h-full overflow-auto pb-4">
            <Card className="max-w-3xl shadow-sm border-slate-200">
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
            <Card className="max-w-3xl shadow-sm border-rose-200 bg-rose-50/30">
              <CardHeader className="border-b border-rose-100 pb-4">
                <CardTitle className="text-rose-700">Danger Zone</CardTitle>
                <CardDescription className="text-rose-600/80">Destructive actions that cannot be undone.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-rose-100 shadow-sm">
                  <div>
                    <h4 className="font-semibold text-slate-800">Factory Reset</h4>
                    <p className="text-sm text-slate-500">Permanently delete all imported data, student records, and logs.</p>
                  </div>
                  <Button 
                    onClick={handleClearData} 
                    disabled={clearDataMutation.isPending}
                    variant="destructive"
                    className="shrink-0"
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

