import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Upload, Download, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface MasterSchool {
  school_id: string;
  school_name: string;
  municipality: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  school_type: string;
}

export function AdminSchoolDirectory() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: schools = [], refetch, isLoading } = useQuery<MasterSchool[]>({
    queryKey: ["/api/admin/directory"],
  });

  const filteredSchools = schools.filter(s => 
    s.school_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.school_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/directory/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: "Import Successful", description: data.message });
        refetch();
      } else {
        toast({ title: "Import Failed", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Upload Error", description: "An error occurred while uploading.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      event.target.value = ""; // Reset file input
    }
  };

  const handleExportJson = () => {
    const jsonString = JSON.stringify(schools, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schools_directory.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col space-y-4 p-6 bg-slate-50/50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Master School Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Single source of truth for all school locations and matching.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportJson} className="gap-2 shadow-sm h-9">
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
          
          <div className="relative">
            <Input 
              type="file" 
              accept=".xlsx,.xls" 
              onChange={handleFileUpload} 
              disabled={isUploading}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Button size="sm" className="gap-2 shadow-sm h-9" disabled={isUploading}>
              <Upload className="w-4 h-4" />
              {isUploading ? "Importing..." : "Import Updated Excel"}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search schools, municipality, or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">School Name</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium text-right">Coordinates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading directory...</td>
                </tr>
              ) : filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No schools found matching "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-3 whitespace-nowrap text-slate-600 font-mono text-xs">{school.school_id}</td>
                    <td className="px-6 py-3 font-medium text-slate-800">{school.school_name}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {school.municipality}, {school.province}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {school.school_type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {school.latitude && school.longitude ? (
                        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100/50">
                          <MapPin className="w-3 h-3" />
                          <span className="font-mono">{school.latitude.toFixed(4)}, {school.longitude.toFixed(4)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Missing</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
          <span>Showing {filteredSchools.length} of {schools.length} schools</span>
        </div>
      </div>
    </div>
  );
}
