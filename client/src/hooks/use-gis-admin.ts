import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { StudentProcessed } from "@shared/schema";

export function useGisOverview() {
  return useQuery({
    queryKey: [api.gis.overview.path],
    queryFn: async () => {
      const res = await fetch(api.gis.overview.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load GIS overview");
      return api.gis.overview.responses[200].parse(await res.json());
    },
  });
}

export function useProcessedStudents() {
  return useQuery({
    queryKey: [api.gis.processedStudents.path],
    queryFn: async () => {
      const res = await fetch(api.gis.processedStudents.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load processed students");
      return api.gis.processedStudents.responses[200].parse(await res.json()) as StudentProcessed[];
    },
  });
}

export function useMappingQueue() {
  return useQuery({
    queryKey: [api.mapping.queue.path],
    queryFn: async () => {
      const res = await fetch(api.mapping.queue.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load mapping queue");
      return api.mapping.queue.responses[200].parse(await res.json());
    },
  });
}

export function useImportLogs() {
  return useQuery({
    queryKey: [api.gis.importLogs.path],
    queryFn: async () => {
      const res = await fetch(api.gis.importLogs.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load import logs");
      return api.gis.importLogs.responses[200].parse(await res.json());
    },
  });
}

export function useSyncStudents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { source?: string; records: Array<{
      studentNumber: string;
      fullName: string;
      course?: string | null;
      lastSchoolName: string;
      lastSchoolType?: string | null;
      studentType?: string | null;
      municipality?: string | null;
      province?: string | null;
      yearLevel?: string | null;
      contactNumber?: string | null;
      schedule?: string | null;
      iskolarNiKap?: string | null;
      requirements?: string | null;
    }> }) => {
      const res = await fetch(api.gis.studentsSync.path, {
        method: api.gis.studentsSync.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Sync failed" }));
        throw new Error(err.message || "Sync failed");
      }
      return api.gis.studentsSync.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.gis.processedStudents.path] });
      queryClient.invalidateQueries({ queryKey: [api.gis.overview.path] });
      queryClient.invalidateQueries({ queryKey: [api.mapping.queue.path] });
      queryClient.invalidateQueries({ queryKey: [api.gis.importLogs.path] });
      queryClient.invalidateQueries({ queryKey: [api.schoolRegistry.list.path] });
    },
  });
}

export function useVerifyMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      schoolRegistryId: number;
      isActive?: boolean;
      latitude?: number | null;
      longitude?: number | null;
      schoolName?: string;
      municipality?: string;
      createAlias?: string;
    }) => {
      const res = await fetch(api.mapping.verify.path, {
        method: api.mapping.verify.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Verify failed" }));
        throw new Error(err.message || "Verify failed");
      }
      return api.mapping.verify.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.schoolRegistry.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.mapping.queue.path] });
      queryClient.invalidateQueries({ queryKey: [api.gis.processedStudents.path] });
    },
  });
}
