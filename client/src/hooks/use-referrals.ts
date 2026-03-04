import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import type { Referral, ReferralInput } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useReferrals() {
  return useQuery<Referral[]>({
    queryKey: [api.referrals.list.path],
  });
}

export function useCreateReferral() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (referral: ReferralInput) => {
      const res = await fetch(api.referrals.create.path, {
        method: api.referrals.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(referral),
      });
      if (!res.ok) throw new Error("Failed to create referral");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.referrals.list.path] });
      toast({
        title: "Success",
        description: "Referral submitted successfully",
      });
    },
  });
}

export function useUpdateReferral() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ReferralInput> }) => {
      const res = await fetch(`/api/referrals/${id}`, {
        method: 'PATCH',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update referral");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.referrals.list.path] });
      toast({
        title: "Success",
        description: "Referral updated successfully",
      });
    },
  });
}

export function useDeleteReferral() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/referrals/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete referral");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.referrals.list.path] });
      toast({
        title: "Success",
        description: "Referral deleted successfully",
      });
    },
  });
}
