import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

type User = {
  id: number;
  username: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  useEffect(() => {
    if (data && typeof data === "object" && !("message" in data)) {
      setUser(data as User);
    } else {
      setUser(null);
    }
  }, [data]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(["/api/user"], data.user);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(["/api/user"], null);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login: async (data) => { await loginMutation.mutateAsync(data); },
        logout: async () => { await logoutMutation.mutateAsync(); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
