import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type SchoolInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// ============================================
// REST HOOKS for Schools Data
// ============================================

export function useSchools() {
  return useQuery({
    queryKey: [api.schools.list.path],
    queryFn: async () => {
      const res = await fetch(api.schools.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch schools');
      return api.schools.list.responses[200].parse(await res.json());
    },
  });
}

export function useSchool(id: number) {
  return useQuery({
    queryKey: [api.schools.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.schools.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch school');
      return api.schools.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateSchool() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: SchoolInput) => {
      const validated = api.schools.create.input.parse(data);
      const res = await fetch(api.schools.create.path, {
        method: api.schools.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create school mapping');
      }
      return api.schools.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.schools.list.path] });
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
      const validated = api.schools.update.input.parse(updates);
      const url = buildUrl(api.schools.update.path, { id });
      const res = await fetch(url, {
        method: api.schools.update.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update school mapping');
      }
      return api.schools.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.schools.list.path] });
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
      const url = buildUrl(api.schools.delete.path, { id });
      const res = await fetch(url, { 
        method: api.schools.delete.method, 
        credentials: "include" 
      });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error('School not found');
        throw new Error('Failed to delete school mapping');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.schools.list.path] });
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
