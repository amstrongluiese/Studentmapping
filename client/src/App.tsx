import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { setDynamicCatalog, setDynamicDepartments } from "@shared/programIntelligence";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";

// Route-level code splitting: keeps /referral and /auth ultra-light on mobile devices
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StudentManagement = lazy(() => import("./pages/StudentManagement"));
const ReferralClient = lazy(() => import("./pages/ReferralClient"));
const AuthPage = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin h-7 w-7 text-primary" />
        <span className="text-xs font-medium tracking-wide">Loading...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Redirect to="/auth" replace />;
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
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/referral" component={ReferralClient} />
        <Route path="/portal" component={ReferralClient} />
        <Route path="/">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/students">
          <ProtectedRoute>
            <StudentManagement />
          </ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
