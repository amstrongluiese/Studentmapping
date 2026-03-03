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
