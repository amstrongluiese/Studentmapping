import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
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

function AppRouter() {
  const { data: dynamicProgs } = useQuery({ queryKey: ["/api/programs"] });
  const { data: dynamicDepts } = useQuery({ queryKey: ["/api/departments"] });
  
  if (dynamicProgs) {
    setDynamicCatalog(dynamicProgs as any);
  }
  if (dynamicDepts) {
    setDynamicDepartments(dynamicDepts as any);
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/referral" component={ReferralClient} />
      <Route path="/students" component={StudentManagement} />
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
          <WouterRouter hook={useHashLocation}>
            <AppRouter />
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
