import { useState } from "react";
import { useSchools, useDeleteSchool } from "@/hooks/use-schools";
import { SchoolFormDialog } from "@/components/SchoolFormDialog";
import MapWrapper from "@/components/MapWrapper";
import { MapLegend } from "@/components/MapLegend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  MapPin, 
  MoreVertical, 
  Trash2, 
  Edit,
  GraduationCap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { School } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Dashboard() {
  const { data: schools, isLoading } = useSchools();
  const deleteMutation = useDeleteSchool();
  
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);

  const filteredSchools = schools?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleAddClick = () => {
    setEditingSchool(null);
    setSelectedCoords(null);
    setDialogOpen(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setEditingSchool(null);
    setSelectedCoords({ lat, lng });
    setDialogOpen(true);
  };

  const handleEdit = (school: School) => {
    setSelectedCoords(null);
    setEditingSchool(school);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this school mapping?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background overflow-hidden">
      
      {/* Sidebar - Data List */}
      <div className="w-full md:w-[400px] flex-shrink-0 flex flex-col border-r border-border bg-card shadow-xl z-20 h-[50vh] md:h-screen transition-all">
        <div className="p-6 pb-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary p-2.5 rounded-xl shadow-inner border border-primary/20">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold leading-tight">Student Origins</h1>
              <p className="text-sm text-muted-foreground">Laguna Mapping System</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search schools..." 
                className="pl-9 bg-secondary/50 border-transparent focus-visible:border-primary focus-visible:ring-1 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="icon" onClick={handleAddClick} className="hover-elevate active-elevate-2 shadow-md hover:shadow-primary/20">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[70%]" />
                    <Skeleton className="h-3 w-[40%]" />
                  </div>
                </div>
              ))
            ) : filteredSchools.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="bg-secondary/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">No schools found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {search ? "Try adjusting your search" : "Click anywhere on the map to add an origin school."}
                </p>
                {!search && (
                  <Button onClick={handleAddClick} variant="outline" className="hover-elevate">
                    Add School Manually
                  </Button>
                )}
              </div>
            ) : (
              filteredSchools.map((school) => (
                <div 
                  key={school.id} 
                  className="group flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-secondary/30 hover:border-primary/30 transition-all hover-elevate cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0 pr-2" onClick={() => handleEdit(school)}>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20 shrink-0">
                      {school.studentCount}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {school.name}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        Laguna
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem onClick={() => handleEdit(school)} className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(school.id)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative z-10 h-[50vh] md:h-screen">
        {/* Subtle inner shadow for depth */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] z-[100]" />
        
        <MapWrapper 
          onAddSchool={handleMapClick} 
          onEditSchool={handleEdit} 
        />
        <MapLegend />
      </div>

      {/* Form Dialog */}
      <SchoolFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        initialData={editingSchool}
        defaultCoordinates={selectedCoords}
      />
    </div>
  );
}
