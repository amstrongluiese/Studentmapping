import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type SchoolInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// ============================================
// REST HOOKS for Schools Data
// ============================================

export function useSchools() {
  return useQuery({
    queryKey: [api.schoolRegistry.list.path],
    queryFn: async () => {
      const res = await fetch(api.schoolRegistry.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch schools');
      return api.schoolRegistry.list.responses[200].parse(await res.json());
    },
  });
}

export function useSchool(id: number) {
  return useQuery({
    queryKey: [api.schoolRegistry.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.schoolRegistry.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch school');
      return api.schoolRegistry.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateSchool() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: SchoolInput) => {
      const validated = api.schoolRegistry.create.input.parse(data);
      const res = await fetch(api.schoolRegistry.create.path, {
        method: api.schoolRegistry.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create school mapping');
      }
      return api.schoolRegistry.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.schoolRegistry.list.path] });
      toast({
        title: "Success",
        description: "School mapped successfully.",
      });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  });
}

export function useUpdateSchool() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<SchoolInput>) => {
      const validated = api.schoolRegistry.update.input.parse(updates);
      const url = buildUrl(api.schoolRegistry.update.path, { id });
      const res = await fetch(url, {
        method: api.schoolRegistry.update.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update school mapping');
      }
      return api.schoolRegistry.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.schoolRegistry.list.path] });
      toast({
        title: "Updated",
        description: "School mapping updated successfully.",
      });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  });
}

export function useDeleteSchool() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.schoolRegistry.delete.path, { id });
      const res = await fetch(url, { 
        method: api.schoolRegistry.delete.method, 
        credentials: "include" 
      });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error('School not found');
        throw new Error('Failed to delete school mapping');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.schoolRegistry.list.path] });
      toast({
        title: "Deleted",
        description: "School mapping removed.",
      });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  });
}

export function useImportSchools() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (schools: SchoolInput[]) => {
      const validated = api.schoolRegistry.import.input.parse({ schoolRegistry: schools });
      const res = await fetch(api.schoolRegistry.import.path, {
        method: api.schoolRegistry.import.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to import school registry');
      }

      return api.schoolRegistry.import.responses[200].parse(await res.json());
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [api.schoolRegistry.list.path] });
      toast({
        title: "Import complete",
        description: `${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`,
      });
    },
    onError: (err) => {
      toast({
        title: "Import failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });
}
