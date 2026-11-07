import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin } from "lucide-react";

export function AdminThemeSettings() {
  const { toast } = useToast();
  
  // Fetch settings from API
  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const [theme, setTheme] = useState("anek");

  useEffect(() => {
    if (settings && settings["login_theme"]) {
      setTheme(settings["login_theme"]);
    }
  }, [settings]);

  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme: string) => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_theme: newTheme }),
      });
      if (!res.ok) {
        throw new Error("Failed to save theme");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Theme Saved", description: "The login page theme has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save the theme.", variant: "destructive" });
    }
  });

  const handleSave = () => {
    updateThemeMutation.mutate(theme);
  };

  if (isLoading) {
    return <div className="p-4">Loading theme settings...</div>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-none shadow-md">
      <CardHeader className="bg-slate-50 rounded-t-lg border-b">
        <CardTitle className="text-xl text-slate-800">Login Page Theme</CardTitle>
        <CardDescription>
          Choose the visual style for the public login page. This setting applies to all users.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <RadioGroup value={theme} onValueChange={setTheme} className="space-y-6">
          
          <div className="flex items-start space-x-3 border p-4 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setTheme("anek")}>
            <div className="mt-1 flex shrink-0 items-center justify-center">
              <RadioGroupItem value="anek" id="theme-anek" checked={theme === "anek"} className="shrink-0" />
            </div>
            <div>
              <Label htmlFor="theme-anek" className="font-semibold text-base cursor-pointer">Iridescent Blobs</Label>
              <p className="text-sm text-slate-500 mt-1">
                A premium glassmorphism design with slow-moving, vibrant gradient blobs that blend department colors.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 border p-4 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setTheme("antigravity")}>
            <div className="mt-1 flex shrink-0 items-center justify-center">
              <RadioGroupItem value="antigravity" id="theme-antigravity" checked={theme === "antigravity"} className="shrink-0" />
            </div>
            <div>
              <Label htmlFor="theme-antigravity" className="font-semibold text-base cursor-pointer">Antigravity Particles</Label>
              <p className="text-sm text-slate-500 mt-1">
                A dynamic matrix of floating, colorful dots that bounce and drift like zero-gravity particles.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 border p-4 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setTheme("mapping_network")}>
            <div className="mt-1 flex shrink-0 items-center justify-center">
              <RadioGroupItem value="mapping_network" id="theme-mapping" checked={theme === "mapping_network"} className="shrink-0" />
            </div>
            <div>
              <Label htmlFor="theme-mapping" className="font-semibold text-base cursor-pointer flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Student Mapping Network
              </Label>
              <p className="text-sm text-slate-500 mt-1">
                A clean, modern light theme featuring floating interactive GIS pins, scholar badges, and connected student mapping nodes.
              </p>
            </div>
          </div>
          
        </RadioGroup>

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={updateThemeMutation.isPending || (settings?.login_theme === theme) || (!settings?.login_theme && theme === 'anek')}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {updateThemeMutation.isPending ? "Saving..." : "Save Theme"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
