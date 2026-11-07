import { useState, useMemo } from "react";
import { Filter, Search, Download, GraduationCap, MapPin, Building2, Layers, CheckCircle2, Map as MapIcon, Loader2 } from "lucide-react";
import { useProcessedStudents } from "@/hooks/use-gis-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { resolveScholarBarangay, BORDER_CATCHMENT_BARANGAYS } from "@shared/scholarBarangayResolver";

interface BarangayScholarTally {
  barangay: string;
  municipality: string;
  totalScholars: number;
  geocodedCount: number;
  courses: Record<string, number>;
  topCourse: string;
  scholarTypes: Record<string, number>;
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function AdminScholarManagement() {
  const { data: students = [], isLoading } = useProcessedStudents();
  const { data: dbBarangays = [] } = useQuery<any[]>({ queryKey: ["/api/barangay-registry"] });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"tally" | "students">("tally");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [courseFilter, setCourseFilter] = useState("All");
  const [municipalityFilter, setMunicipalityFilter] = useState("All");
  const [barangayFilter, setBarangayFilter] = useState("All");
  const [geolocatingBarangay, setGeolocatingBarangay] = useState<string | null>(null);

  const saveBarangayMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/barangay-registry", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barangay-registry"] });
    },
  });

  const handleGeolocate = async (tally: BarangayScholarTally) => {
    try {
      const queryKey = `${tally.municipality}__${tally.barangay}`;
      setGeolocatingBarangay(queryKey);
      
      let lat: number | null = null;
      let lng: number | null = null;

      // 1. Try Client-side Google Geocoder if loaded
      if (window.google?.maps?.Geocoder) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          const searchQuery = `${tally.barangay}, ${tally.municipality}, Laguna, Philippines`;
          const response = await geocoder.geocode({ address: searchQuery, region: "ph" });
          if (response.results && response.results.length > 0) {
            lat = response.results[0].geometry.location.lat();
            lng = response.results[0].geometry.location.lng();
          }
        } catch {
          // Fall through to server-side geocoding
        }
      }

      // 2. Fall back to Server-side Geocoder if client-side is unavailable or failed
      if (!lat || !lng) {
        const resp = await fetch("/api/geocode/school", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Barangay ${tally.barangay}`,
            municipality: tally.municipality || "Laguna",
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.success && typeof data.latitude === "number" && typeof data.longitude === "number") {
            lat = data.latitude;
            lng = data.longitude;
          }
        }
      }

      if (!lat || !lng) {
        throw new Error("Unable to locate coordinates for this barangay.");
      }

      await saveBarangayMutation.mutateAsync({
        province: "Laguna",
        municipality: tally.municipality,
        barangayName: tally.barangay,
        normalizedName: tally.barangay.toLowerCase(),
        latitude: lat,
        longitude: lng,
      });

      toast({ 
        title: "Geolocation Success!", 
        description: `Successfully mapped ${tally.barangay} to [${lat.toFixed(4)}, ${lng.toFixed(4)}]`
      });

    } catch (e: any) {
      toast({ 
        title: "Geolocation Failed", 
        description: e.message || "Unable to locate barangay on the map.", 
        variant: "destructive" 
      });
    } finally {
      setGeolocatingBarangay(null);
    }
  };

  // Only include students marked as scholars
  const scholars = useMemo(() => {
    return students.filter(s => {
      if (!s.iskolarNiKap) return false;
      const v = s.iskolarNiKap.toLowerCase().trim();
      return v !== "" && v !== "no" && v !== "false";
    });
  }, [students]);

  const scholarsWithLocation = useMemo(() => {
    return scholars.map(s => {
      let mun = s.municipality?.trim() || "Laguna";
      let brgy = "Unmapped / Special Cases";
      let lat: number | null = null;
      let lng: number | null = null;

      const resolved = resolveScholarBarangay(s, dbBarangays);
      if (resolved) {
        brgy = resolved.barangayName;
        mun = resolved.municipality;
        lat = resolved.latitude;
        lng = resolved.longitude;
      }

      return { 
        ...s, 
        cleanBarangay: brgy, 
        cleanMunicipality: mun,
        latitude: lat,
        longitude: lng
      };
    });
  }, [scholars, dbBarangays]);

  const municipalities = useMemo(() => {
    const set = new Set(scholarsWithLocation.map(s => s.cleanMunicipality).filter(Boolean));
    return Array.from(set).sort();
  }, [scholarsWithLocation]);

  const barangays = useMemo(() => {
    let list = scholarsWithLocation;
    if (municipalityFilter !== "All") {
      list = list.filter(s => s.cleanMunicipality === municipalityFilter);
    }
    const set = new Set(list.map(s => s.cleanBarangay).filter(Boolean));
    return Array.from(set).sort();
  }, [scholarsWithLocation, municipalityFilter]);

  const courses = useMemo(() => {
    const set = new Set(scholarsWithLocation.map(s => s.course).filter((c): c is string => Boolean(c)));
    return Array.from(set).sort();
  }, [scholarsWithLocation]);

  // Group scholars by Barangay for the Tally module
  const barangayTallies = useMemo<BarangayScholarTally[]>(() => {
    const map = new Map<string, BarangayScholarTally>();

    // 1. Pre-populate map with all official database barangays
    for (const b of dbBarangays) {
      if (!b.barangayName || !b.municipality) continue;
      const key = `${b.municipality.toLowerCase()}__${b.barangayName.toLowerCase()}`;
      map.set(key, {
        barangay: b.barangayName,
        municipality: b.municipality,
        totalScholars: 0,
        geocodedCount: 0,
        courses: {},
        topCourse: "-",
        scholarTypes: {},
      });
    }

    // Add unmapped bucket as a default container
    const unmappedKey = "laguna__unmapped / special cases";
    map.set(unmappedKey, {
      barangay: "Unmapped / Special Cases",
      municipality: "Laguna",
      totalScholars: 0,
      geocodedCount: 0,
      courses: {},
      topCourse: "-",
      scholarTypes: {},
    });

    // 2. Loop through scholars and fill their respective barangay registry buckets
    for (const s of scholarsWithLocation) {
      const brgy = s.cleanBarangay;
      const mun = s.cleanMunicipality;
      let key = `${mun.toLowerCase()}__${brgy.toLowerCase()}`;

      if (!map.has(key)) {
        key = unmappedKey;
      }

      const item = map.get(key)!;
      item.totalScholars += 1;
      
      // If student is matched to a geocoded registry entry, mark it as geocoded
      if ((s as any).latitude && (s as any).longitude) {
        item.geocodedCount += 1;
      }

      const courseName = s.course || "General";
      item.courses[courseName] = (item.courses[courseName] || 0) + 1;

      const typeLabel = s.iskolarNiKap || "Iskolar";
      item.scholarTypes[typeLabel] = (item.scholarTypes[typeLabel] || 0) + 1;
    }

    // Compute top course for each barangay
    for (const tally of Array.from(map.values())) {
      let max = 0;
      let top = "-";
      for (const [c, cnt] of Object.entries(tally.courses)) {
        if (cnt > max) {
          max = cnt;
          top = c;
        }
      }
      tally.topCourse = top;
    }

    // Only display card folders that have active scholars
    return Array.from(map.values())
      .filter(t => t.totalScholars > 0)
      .sort((a, b) => b.totalScholars - a.totalScholars);
  }, [scholarsWithLocation]);

  const filteredTallies = useMemo(() => {
    let list = barangayTallies;
    if (municipalityFilter !== "All") {
      list = list.filter(t => t.municipality === municipalityFilter);
    }
    if (barangayFilter !== "All") {
      list = list.filter(t => t.barangay === barangayFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.barangay.toLowerCase().includes(q) || t.municipality.toLowerCase().includes(q));
    }
    return list;
  }, [barangayTallies, municipalityFilter, barangayFilter, search]);

  const filtered = useMemo(() => {
    let result = scholarsWithLocation;

    if (courseFilter !== "All") {
      result = result.filter(s => s.course === courseFilter);
    }
    
    if (municipalityFilter !== "All") {
      result = result.filter(s => s.cleanMunicipality === municipalityFilter);
    }

    if (barangayFilter !== "All") {
      result = result.filter(s => s.cleanBarangay === barangayFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => 
        s.fullName.toLowerCase().includes(q) || 
        s.studentNumber.toLowerCase().includes(q) ||
        (s.previousSchool && s.previousSchool.toLowerCase().includes(q)) ||
        (s.cleanBarangay && s.cleanBarangay.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [scholarsWithLocation, courseFilter, municipalityFilter, barangayFilter, search]);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  
  const pageRows = useMemo(() => 
    filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), 
  [filtered, currentPage, pageSize]);

  const handleExport = () => {
    const jsonString = JSON.stringify(filtered, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scholars_export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h3 className="text-xl font-black text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-indigo-500" />
            Scholar Management System
          </h3>
          <p className="text-sm text-muted-foreground">
            Collect, aggregate, and manage all verified student scholars across Laguna.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 border-border/60 bg-muted/30 text-foreground hover:bg-muted/60 shadow-sm text-xs font-semibold" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export Scholar Data
          </Button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl border border-indigo-500/20 bg-card/80 p-4 shadow-sm backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Total Verified Scholars</p>
          <p className="text-2xl font-black font-mono tracking-tight text-foreground mt-1">{scholarsWithLocation.length.toLocaleString()}</p>
        </Card>
        <Card className="rounded-2xl border border-emerald-500/20 bg-card/80 p-4 shadow-sm backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400">Barangays Represented</p>
          <p className="text-2xl font-black font-mono tracking-tight text-foreground mt-1">{barangayTallies.length.toLocaleString()}</p>
        </Card>
        <Card className="rounded-2xl border border-sky-500/20 bg-card/80 p-4 shadow-sm backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500 dark:text-sky-400">Municipalities</p>
          <p className="text-2xl font-black font-mono tracking-tight text-foreground mt-1">{municipalities.length.toLocaleString()}</p>
        </Card>
        <Card className="rounded-2xl border border-violet-500/20 bg-card/80 p-4 shadow-sm backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500 dark:text-violet-400">Geocoded Locations</p>
          <p className="text-2xl font-black font-mono tracking-tight text-foreground mt-1">
            {scholarsWithLocation.filter(s => (s as any).latitude && (s as any).longitude).length.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-2 rounded-xl bg-card/60 p-3 border border-border/50 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="scholarSearch"
              name="scholarSearch"
              aria-label="Search scholar, student"
              placeholder="Search scholar, student..."
              className="pl-9 h-9 border-border/60 bg-muted/30 text-foreground placeholder:text-muted-foreground text-xs"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <Select value={municipalityFilter} onValueChange={(v) => { setMunicipalityFilter(v); setBarangayFilter("All"); setPage(1); }}>
            <SelectTrigger className="h-9 w-[170px] border-border/60 bg-muted/30 text-foreground text-xs">
              <SelectValue placeholder="All Municipalities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Municipalities</SelectItem>
              {municipalities.map(m => (
                <SelectItem key={m || "Unknown"} value={m || "Unknown"}>{m || "Unknown"}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={barangayFilter} onValueChange={(v) => { setBarangayFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[170px] border-border/60 bg-muted/30 text-foreground text-xs">
              <SelectValue placeholder="All Barangays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Barangays</SelectItem>
              {barangays.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={courseFilter} onValueChange={(v) => { setCourseFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[170px] border-border/60 bg-muted/30 text-foreground text-xs">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Courses</SelectItem>
              {courses.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(municipalityFilter !== "All" || barangayFilter !== "All" || courseFilter !== "All" || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setMunicipalityFilter("All");
                setBarangayFilter("All");
                setCourseFilter("All");
                setSearch("");
                setPage(1);
              }}
            >
              ✕ Clear
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="h-10 bg-muted/60 p-1 rounded-xl border border-border/40 backdrop-blur-md">
          <TabsTrigger value="tally" className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Scholar Analytics ({filteredTallies.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            Scholar Directory ({filtered.length})
          </TabsTrigger>
        </TabsList>

        {/* Barangay Tallies Grid & Table */}
        <TabsContent value="tally" className="pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">Loading barangay scholar analytics...</div>
            ) : filteredTallies.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">No barangay tallies match your criteria.</div>
            ) : filteredTallies.map((tally) => (
              <Card key={`${tally.municipality}__${tally.barangay}`} className="hover:shadow-md transition-all border-border/60 bg-card">
                <CardHeader className="pb-2 bg-muted/20 border-b border-border/40">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">{tally.barangay}</CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {tally.municipality}, Laguna
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-mono text-xs">
                      {tally.totalScholars} Scholars
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-border/30 pb-1.5">
                    <span className="text-muted-foreground font-medium">Top Course:</span>
                    <span className="font-semibold text-foreground/90 truncate max-w-[170px]" title={tally.topCourse}>
                      {tally.topCourse}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/30 pb-1.5">
                    <span className="text-muted-foreground font-medium">Geocoded Status:</span>
                    <div className="flex items-center gap-2">
                      {tally.geocodedCount === tally.totalScholars && tally.totalScholars > 0 ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-500">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Fully Mapped
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 font-semibold text-[10px] uppercase">
                            {tally.geocodedCount} of {tally.totalScholars} Mapped
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 text-[10px] px-2"
                            onClick={() => handleGeolocate(tally)}
                            disabled={geolocatingBarangay === `${tally.municipality}__${tally.barangay}`}
                          >
                            {geolocatingBarangay === `${tally.municipality}__${tally.barangay}` ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <MapPin className="h-3 w-3 mr-1 text-indigo-500" />
                            )}
                            Geolocate
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pt-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Scholar Types</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(tally.scholarTypes).map(([type, cnt]) => (
                        <Badge key={type} variant="secondary" className="text-[10px] bg-muted/60 text-foreground">
                          {type}: {cnt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Scholar Directory Table */}
        <TabsContent value="students" className="pt-3">
          <Card className="overflow-hidden rounded-lg border-border/60 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table className="min-w-[850px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Student No.</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Barangay</TableHead>
                    <TableHead>Scholar Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading scholars...</TableCell></TableRow>
                  ) : pageRows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No scholars found matching your criteria.</TableCell></TableRow>
                  ) : pageRows.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="font-medium text-foreground">{student.fullName}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {student.studentNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                          {student.course}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-foreground/90">{student.cleanBarangay}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">
                          {student.iskolarNiKap}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-border/60 px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {filtered.length.toLocaleString()} scholars</span>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <span className="min-w-[92px] text-center text-xs">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
