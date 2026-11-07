import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Edit2, Trash2, Plus, Loader2 } from "lucide-react";

export function AdminBarangayRegistry() {
  const { data: barangays = [], isLoading } = useQuery<any[]>({ 
    queryKey: ["/api/barangay-registry"] 
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [editingBarangay, setEditingBarangay] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        const res = await apiRequest("PATCH", `/api/barangay-registry/${data.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/barangay-registry", data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barangay-registry"] });
      toast({ title: "Success", description: "Barangay record saved successfully." });
      setIsDialogOpen(false);
      setEditingBarangay(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/barangay-registry/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barangay-registry"] });
      toast({ title: "Success", description: "Barangay deleted successfully." });
    }
  });

  const filteredBarangays = barangays.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.barangayName.toLowerCase().includes(q) || b.municipality.toLowerCase().includes(q);
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      id: editingBarangay?.id,
      province: formData.get("province") || "Laguna",
      municipality: formData.get("municipality"),
      barangayName: formData.get("barangayName"),
      normalizedName: (formData.get("barangayName") as string).toLowerCase(),
      latitude: parseFloat(formData.get("latitude") as string) || null,
      longitude: parseFloat(formData.get("longitude") as string) || null,
    };
    saveMutation.mutate(data);
  };

  const openNew = () => {
    setEditingBarangay(null);
    setIsDialogOpen(true);
  };

  const openEdit = (barangay: any) => {
    setEditingBarangay(barangay);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" />
            Barangay Geocode Registry
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage the list of barangays used by the map engine. Ensure names match student records.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-4 w-4" />
          Add Barangay
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border/60 shadow-sm w-full max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search barangay or municipality..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 shadow-none focus-visible:ring-0 px-2 bg-transparent text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Barangay</TableHead>
              <TableHead>Municipality</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBarangays.map((b) => (
              <TableRow key={b.id} className="hover:bg-muted/40">
                <TableCell className="font-medium text-foreground">{b.barangayName}</TableCell>
                <TableCell className="text-muted-foreground">{b.municipality}, {b.province}</TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {b.latitude ? `${b.latitude}, ${b.longitude}` : "Missing GPS"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                      <Edit2 className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${b.barangayName}?`)) {
                          deleteMutation.mutate(b.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredBarangays.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  No barangays found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBarangay ? "Edit Barangay" : "Add Barangay"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Municipality</Label>
                <Input name="municipality" defaultValue={editingBarangay?.municipality || ""} required />
              </div>
              <div className="space-y-2">
                <Label>Province</Label>
                <Input name="province" defaultValue={editingBarangay?.province || "Laguna"} required />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Barangay Name (Strict spelling)</Label>
              <Input name="barangayName" defaultValue={editingBarangay?.barangayName || ""} required placeholder="e.g. De La Paz" />
              <p className="text-[10px] text-muted-foreground leading-tight">
                This must exactly match (or strictly fuzzy match) the text encoded by students to link them automatically.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input name="latitude" type="number" step="any" defaultValue={editingBarangay?.latitude || ""} />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input name="longitude" type="number" step="any" defaultValue={editingBarangay?.longitude || ""} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Barangay
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
