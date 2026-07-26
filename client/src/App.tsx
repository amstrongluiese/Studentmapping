import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Dashboard from "./pages/Dashboard";
import ReferralClient from "./pages/ReferralClient";
import StudentManagement from "./pages/StudentManagement";
import { setDynamicCatalog, setDynamicDepartments } from "@shared/programIntelligence";
import AuthPage from "./pages/Auth";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <>{children}</>;
}

function AppRouter() {
  const { data: dynamicProgs } = useQuery({ queryKey: ["/api/programs"] });
  const { data: dynamicDepts } = useQuery({ queryKey: ["/api/departments"] });

  useEffect(() => {
    if (dynamicProgs) {
      setDynamicCatalog(dynamicProgs as any);
    }
  }, [dynamicProgs]);

  useEffect(() => {
    if (dynamicDepts) {
      setDynamicDepartments(dynamicDepts as any);
    }
  }, [dynamicDepts]);

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/referral" component={ReferralClient} />
      <Route path="/students">
        <ProtectedRoute>
          <StudentManagement />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
