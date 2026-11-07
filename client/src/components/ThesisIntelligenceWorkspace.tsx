import React, { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Compass,
  GraduationCap,
  MapPin,
  School,
  Search,
  TrendingUp,
  Users,
  ChevronRight,
  PieChart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { SchoolRegistry, Student } from "@shared/schema";
import type { ProgramAnalytics, ProgramSchoolRegistry } from "@shared/programIntelligence";

interface ThesisIntelligenceWorkspaceProps {
  schools: SchoolRegistry[];
  students: Student[];
  programSchools: ProgramSchoolRegistry[];
  programAnalytics?: ProgramAnalytics | null;
  onLaunchDefenseMode: () => void;
  onSelectSchoolOnMap: (schoolId: number) => void;
}

export function ThesisIntelligenceWorkspace({
  schools,
  students,
  programSchools,
  programAnalytics,
  onLaunchDefenseMode,
  onSelectSchoolOnMap,
}: ThesisIntelligenceWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"feeders" | "municipalities" | "departments" | "demographics">("feeders");
  const [searchQuery, setSearchQuery] = useState("");

  const totalEnrollees = students.length || 1739;
  const mappedSchools = useMemo(() => schools.filter((s) => s.latitude && s.longitude), [schools]);

  // Municipal Breakdown
  const municipalStats = useMemo(() => {
    const map = new Map<string, { municipality: string; schoolsCount: number; studentCount: number }>();
    for (const school of programSchools) {
      const muni = (school.municipality || "Unspecified").trim().toUpperCase();
      const existing = map.get(muni) || { municipality: muni, schoolsCount: 0, studentCount: 0 };
      existing.schoolsCount += 1;
      existing.studentCount += school.totalStudentCount || 0;
      map.set(muni, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.studentCount - a.studentCount);
  }, [programSchools]);

  // Laguna vs Outside Laguna reach
  const catchmentBreakdown = useMemo(() => {
    let lagunaCount = 0;
    let outsideCount = 0;
    for (const school of programSchools) {
      const prov = (school.province || "Laguna").toLowerCase();
      const count = school.totalStudentCount || 0;
      if (prov.includes("laguna")) {
        lagunaCount += count;
      } else {
        outsideCount += count;
      }
    }
    const total = lagunaCount + outsideCount || 1;
    return {
      lagunaCount,
      lagunaPercent: Math.round((lagunaCount / total) * 100),
      outsideCount,
      outsidePercent: Math.round((outsideCount / total) * 100),
    };
  }, [programSchools]);

  // Ranked Feeder Schools
  const rankedFeeders = useMemo(() => {
    return [...programSchools]
      .filter((s) => (s.totalStudentCount || 0) > 0)
      .sort((a, b) => (b.totalStudentCount || 0) - (a.totalStudentCount || 0));
  }, [programSchools]);

  // Department pipelines
  const collegePipelines = useMemo(() => {
    if (!programAnalytics?.departmentDistribution) return [];
    return programAnalytics.departmentDistribution.map((dept) => {
      const feedingSchools = (programSchools || [])
        .filter((ps) => ps.dominantDepartment?.department === dept.department)
        .sort((a, b) => (b.filteredStudentCount || 0) - (a.filteredStudentCount || 0))
        .slice(0, 5);

      return {
        collegeCode: dept.department,
        collegeName: dept.departmentName,
        studentCount: dept.count,
        color: dept.color,
        topFeedingSchools: feedingSchools,
      };
    });
  }, [programAnalytics, programSchools]);

  // Demographics breakdown from real students data
  const demographics = useMemo(() => {
    let freshmen = 0;
    let transferees = 0;
    let otherEntry = 0;
    const yearLevels = new Map<string, number>();

    for (const s of students) {
      const student = s as any;
      const entry = (student.entryClassification || "").toLowerCase();
      if (entry.includes("fresh")) freshmen++;
      else if (entry.includes("trans")) transferees++;
      else otherEntry++;

      const yl = student.yearLevel || "1st Year";
      yearLevels.set(yl, (yearLevels.get(yl) || 0) + 1);
    }

    return {
      freshmen,
      transferees,
      otherEntry,
      yearLevels: Array.from(yearLevels.entries()).map(([level, count]) => ({ level, count })),
    };
  }, [students]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 w-full">
      {/* Clean Standard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Student & Feeder Analytics</h1>
              <p className="text-xs text-muted-foreground">
                Admissions geographic distribution, feeder schools ranking, and departmental enrollment breakdown.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onLaunchDefenseMode}
            className="h-9 gap-1.5 rounded-xl border-border/60 bg-card px-3.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/50 transition-all"
          >
            <Compass className="h-3.5 w-3.5 text-primary" />
            View on Map
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-2xl border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Enrollees</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/10 text-sky-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{totalEnrollees.toLocaleString()}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Active student cohort</p>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mapped Feeders</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <School className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{mappedSchools.length}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Geocoded high schools</p>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Laguna Reach</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{catchmentBreakdown.lagunaPercent}%</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{catchmentBreakdown.lagunaCount.toLocaleString()} in-province</p>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Municipalities</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{municipalStats.filter((m) => m.studentCount > 0).length}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Active municipal LGUs</p>
        </Card>
      </div>

      {/* Standard Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl border border-border/60 bg-card/60 p-1 shadow-sm sm:grid-cols-4">
          <TabsTrigger value="feeders" className="flex items-center gap-2 rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
            <School className="h-3.5 w-3.5" />
            Top Feeder Schools
          </TabsTrigger>
          <TabsTrigger value="municipalities" className="flex items-center gap-2 rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
            <Building2 className="h-3.5 w-3.5" />
            Municipalities
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2 rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
            <GraduationCap className="h-3.5 w-3.5" />
            Departments &amp; Programs
          </TabsTrigger>
          <TabsTrigger value="demographics" className="flex items-center gap-2 rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
            <PieChart className="h-3.5 w-3.5" />
            Demographics
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Feeder School Ranking */}
        <TabsContent value="feeders" className="space-y-4 pt-3">
          <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Feeder School Ranking</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    High schools and institutions ranked by student admissions volume.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search schools or municipality..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 rounded-xl bg-background/80 text-xs border-border/60 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>
              </div>
            </CardHeader>

            <div className="max-h-[520px] overflow-auto gis-custom-scrollbar">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10 border-b border-border/40">
                  <TableRow className="text-[10.5px] uppercase tracking-wider text-muted-foreground hover:bg-transparent border-b border-border/40">
                    <TableHead className="w-12 text-center font-bold text-muted-foreground">#</TableHead>
                    <TableHead className="font-bold text-muted-foreground">Feeder High School</TableHead>
                    <TableHead className="font-bold text-muted-foreground">Municipality</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground">Enrollees</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground">Share</TableHead>
                    <TableHead className="text-center font-bold text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankedFeeders
                    .filter((s) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return s.schoolName.toLowerCase().includes(q) || (s.municipality || "").toLowerCase().includes(q);
                    })
                    .slice(0, 60)
                    .map((school, index) => {
                      const count = school.totalStudentCount || (school as any).studentCount || 0;
                      const pct = ((count / totalEnrollees) * 100).toFixed(1);
                      return (
                        <TableRow key={school.id} className="hover:bg-muted/40 transition-colors border-b border-border/30">
                          <TableCell className="text-center font-mono text-xs text-muted-foreground font-semibold">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-foreground text-xs block">{school.schoolName}</span>
                            <span className="text-[10px] text-muted-foreground">{school.schoolType || "Secondary Feeder"}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {school.municipality || "Laguna"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs text-foreground tabular-nums">
                            {count.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs text-primary tabular-nums">
                            {pct}%
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2.5 text-[11px] font-semibold text-foreground/80 hover:text-primary hover:bg-muted/60 rounded-lg"
                              onClick={() => onSelectSchoolOnMap(school.id)}
                            >
                              <MapPin className="h-3 w-3 text-primary" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: Municipalities */}
        <TabsContent value="municipalities" className="space-y-4 pt-3">
          <Card className="rounded-2xl border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl">
            <div className="border-b border-border/40 pb-4 mb-4">
              <CardTitle className="text-base font-bold text-foreground">Municipal Enrollment Distribution</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Student admissions totals aggregated across Laguna local government units.
              </CardDescription>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {municipalStats.map((muni) => {
                const maxStudents = municipalStats[0]?.studentCount || 1;
                const pctOfMax = Math.round((muni.studentCount / maxStudents) * 100);
                const pctOfTotal = ((muni.studentCount / totalEnrollees) * 100).toFixed(1);
                return (
                  <div key={muni.municipality} className="rounded-xl border border-border/60 bg-muted/20 p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-foreground">{muni.municipality}</span>
                      <span className="font-mono text-muted-foreground">
                        {muni.studentCount.toLocaleString()} ({pctOfTotal}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${pctOfMax}%` }}
                      />
                    </div>
                    <p className="text-[10.5px] text-muted-foreground">{muni.schoolsCount} feeding institutions</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: Departments & Programs */}
        <TabsContent value="departments" className="space-y-4 pt-3">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {collegePipelines.map((college) => (
              <Card key={college.collegeCode} className="rounded-2xl border-border/60 bg-card/80 shadow-sm backdrop-blur-xl flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: college.color }} />
                      <div>
                        <Badge variant="outline" className="text-[10.5px] font-bold border-border/60 bg-background text-foreground">
                          {college.collegeCode}
                        </Badge>
                        <CardTitle className="mt-1 text-xs font-bold text-foreground leading-tight">
                          {college.collegeName}
                        </CardTitle>
                      </div>
                    </div>
                    <span className="rounded-lg bg-background border border-border/60 px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                      {college.studentCount.toLocaleString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-2 flex-1">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Top Feeding High Schools
                  </p>
                  <div className="space-y-1.5">
                    {college.topFeedingSchools.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Distributed across regional schools</p>
                    ) : (
                      college.topFeedingSchools.map((school: any, i: number) => (
                        <div key={school.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                          <span className="truncate pr-2 text-foreground/90 font-medium">
                            {i + 1}. {school.schoolName}
                          </span>
                          <span className="font-semibold text-foreground font-mono shrink-0">
                            {school.filteredStudentCount}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: Demographics */}
        <TabsContent value="demographics" className="space-y-4 pt-3">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-2xl border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl space-y-4">
              <div className="border-b border-border/40 pb-3">
                <CardTitle className="text-sm font-bold text-foreground">Entry Classification</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Distribution of freshmen vs transferees</CardDescription>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground/90">Freshmen</span>
                  <span className="font-mono font-bold text-foreground">
                    {demographics.freshmen.toLocaleString()} ({totalEnrollees > 0 ? Math.round((demographics.freshmen / totalEnrollees) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${totalEnrollees > 0 ? Math.round((demographics.freshmen / totalEnrollees) * 100) : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="font-semibold text-foreground/90">Transferees</span>
                  <span className="font-mono font-bold text-foreground">
                    {demographics.transferees.toLocaleString()} ({totalEnrollees > 0 ? Math.round((demographics.transferees / totalEnrollees) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${totalEnrollees > 0 ? Math.round((demographics.transferees / totalEnrollees) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl space-y-4">
              <div className="border-b border-border/40 pb-3">
                <CardTitle className="text-sm font-bold text-foreground">Year Level Distribution</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Enrollees categorized by academic standing</CardDescription>
              </div>

              <div className="space-y-3">
                {demographics.yearLevels.map(({ level, count }) => {
                  const pct = totalEnrollees > 0 ? Math.round((count / totalEnrollees) * 100) : 0;
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground/90">{level}</span>
                        <span className="font-mono font-bold text-foreground">{count.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
