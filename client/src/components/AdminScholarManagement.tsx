import { useState, useMemo } from "react";
import { Filter, Search, Download, GraduationCap, MapPin } from "lucide-react";
import { useProcessedStudents } from "@/hooks/use-gis-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function AdminScholarManagement() {
  const { data: students = [], isLoading } = useProcessedStudents();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [courseFilter, setCourseFilter] = useState("All");
  const [municipalityFilter, setMunicipalityFilter] = useState("All");

  // Only include students marked as scholars
  const scholars = useMemo(() => {
    return students.filter(s => {
      if (!s.iskolarNiKap) return false;
      const val = s.iskolarNiKap.toLowerCase().trim();
      return val === "yes" || val === "true" || val === "1" || val === "iskolar";
    });
  }, [students]);

  const municipalities = useMemo(() => {
    const set = new Set(scholars.map(s => s.municipality).filter(Boolean));
    return Array.from(set).sort();
  }, [scholars]);

  const courses = useMemo(() => {
    const set = new Set(scholars.map(s => s.course).filter(Boolean));
    return Array.from(set).sort();
  }, [scholars]);

  const filtered = useMemo(() => {
    let result = scholars;

    if (courseFilter !== "All") {
      result = result.filter(s => s.course === courseFilter);
    }
    
    if (municipalityFilter !== "All") {
      result = result.filter(s => s.municipality === municipalityFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => 
        s.fullName.toLowerCase().includes(q) || 
        s.studentNumber.toLowerCase().includes(q) ||
        (s.previousSchool && s.previousSchool.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [scholars, courseFilter, municipalityFilter, search]);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  
  // Memoized page slicing for high performance
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Scholar Management
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage, filter, and track verified scholars across Laguna municipalities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-slate-50/80 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[250px]">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by name, student no..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <Select value={municipalityFilter} onValueChange={(v) => { setMunicipalityFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="All Municipalities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Municipalities</SelectItem>
              {municipalities.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={courseFilter} onValueChange={(v) => { setCourseFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Courses</SelectItem>
              {courses.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(municipalityFilter !== "All" || courseFilter !== "All" || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-slate-500 hover:text-slate-900"
              onClick={() => {
                setMunicipalityFilter("All");
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

      <Card className="overflow-hidden rounded-lg border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Student No.</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Municipality</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading scholars...</TableCell></TableRow>
              ) : pageRows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No scholars found matching your criteria.</TableCell></TableRow>
              ) : pageRows.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <p className="font-semibold">{student.fullName}</p>
                    <p className="text-xs text-slate-500">{student.previousSchool || "No school provided"}</p>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{student.studentNumber}</TableCell>
                  <TableCell>{student.course || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {student.municipality}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Iskolar
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 px-3 py-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>{filtered.length.toLocaleString()} total scholars</span>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <span className="min-w-[92px] text-center text-xs">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
