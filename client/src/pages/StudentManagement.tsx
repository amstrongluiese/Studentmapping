import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentImport {
  id: number;
  studentNumber: string;
  fullName: string;
  previousSchool: string | null;
  program: string | null;
  scholarship: string | null;
  municipality: string | null;
  importSource: string | null;
  importStatus: string;
  importedAt: string;
}

export default function StudentManagement() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: students = [], isLoading, error, refetch } = useQuery<StudentImport[]>({
    queryKey: ["/api/imports/staging"],
    staleTime: 60000, // 1 minute
  });

  const filteredStudents = students.filter(student => 
    student.fullName.toLowerCase().includes(search.toLowerCase()) || 
    student.studentNumber.toLowerCase().includes(search.toLowerCase()) ||
    (student.previousSchool && student.previousSchool.toLowerCase().includes(search.toLowerCase()))
  );

  const handleApplyToGis = async () => {
    try {
      const res = await fetch("/api/imports/apply", { method: "POST" });
      if (!res.ok) throw new Error("Failed to apply records");
      const data = await res.json();
      toast({ title: "Success", description: `Applied ${data.appliedCount} matched students to GIS.` });
      refetch();
    } catch (e) {
      toast({ title: "Error", description: "Failed to apply records", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/60 bg-white/40 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight">Student Management</h1>
              <p className="text-[12px] text-slate-500">View and manage processed student records</p>
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-6 w-full max-w-7xl mx-auto space-y-6">
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[15px] font-semibold">Processed Students</CardTitle>
                  <CardDescription className="text-[13px] mt-1">
                    {students.length} total students synced to the database.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-72">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search by name, ID, or school..." 
                      className="pl-9 h-9 text-[13px] bg-slate-50 border-slate-200 focus-visible:ring-teal-500"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleApplyToGis}
                    className="h-9 px-4 text-[13px] font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-md shadow-sm transition-colors"
                  >
                    Apply To GIS
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-[13px] font-medium">Loading students...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 text-rose-500 bg-rose-50/50">
                  <AlertCircle className="h-6 w-6 mb-2 opacity-80" />
                  <span className="text-[13px] font-medium">Failed to load student data.</span>
                </div>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <Table className="min-w-[1000px] w-full">
                    <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10 px-6">Student #</TableHead>
                        <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Full Name</TableHead>
                        <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Program</TableHead>
                        <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Last School</TableHead>
                        <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Municipality</TableHead>
                        <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10">Scholarship</TableHead>
                        <TableHead className="whitespace-nowrap text-[12px] font-semibold text-slate-500 h-10 text-right px-6">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-[13px] text-slate-500">
                            No students found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student) => (
                          <TableRow key={student.id} className="text-[13px] hover:bg-slate-50/80">
                            <TableCell className="font-mono text-[12px] text-slate-500 px-6">{student.studentNumber || "—"}</TableCell>
                            <TableCell className="font-medium text-slate-900">{student.fullName}</TableCell>
                            <TableCell className="text-slate-600">{student.program || "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-slate-800" title={student.previousSchool || ""}>
                              {student.previousSchool || "—"}
                            </TableCell>
                            <TableCell className="text-slate-600">{student.municipality || "—"}</TableCell>
                            <TableCell>
                              {student.scholarship ? (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 shadow-none hover:bg-blue-100 font-medium whitespace-nowrap">
                                  {student.scholarship}
                                </Badge>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <Badge variant="secondary" className={`shadow-none font-medium ${
                                student.importStatus === "Applied" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" :
                                student.importStatus === "Matched" ? "bg-blue-50 text-blue-700 hover:bg-blue-100" :
                                "bg-amber-50 text-amber-700 hover:bg-amber-100"
                              }`}>
                                {student.importStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
