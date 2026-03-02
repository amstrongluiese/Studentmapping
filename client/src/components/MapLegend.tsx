import { useSchools } from "@/hooks/use-schools";
import { Users, AlertCircle, TrendingUp } from "lucide-react";

export function MapLegend() {
  const { data: schools } = useSchools();
  
  if (!schools || schools.length === 0) return null;

  const totalStudents = schools.reduce((sum, s) => sum + s.studentCount, 0);
  const topSchool = [...schools].sort((a, b) => b.studentCount - a.studentCount)[0];

  return (
    <div className="absolute bottom-6 right-6 z-[1000] glass-panel rounded-2xl p-5 min-w-[280px] shadow-2xl animate-in slide-in-from-bottom-8 fade-in duration-500 hidden md:block">
      <h3 className="font-display font-bold text-lg mb-1 flex items-center gap-2">
        <MapPinIcon />
        Trimex Student Origins
      </h3>
      <p className="text-[10px] text-muted-foreground mb-4 leading-tight italic">
        Visualizing where our students came from before enrolling at Trimex Colleges.
      </p>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Trimex Enrollees</p>
              <p className="text-xl font-bold text-foreground">{totalStudents.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {topSchool && (
          <div className="p-3 bg-card rounded-xl border border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Top Source School
            </p>
            <p className="font-semibold text-sm truncate" title={topSchool.name}>
              {topSchool.name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {topSchool.studentCount} students enrolled at Trimex
            </p>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <p>Counts reflect Trimex enrollment from these schools.</p>
        </div>
      </div>
    </div>
  );
}

function MapPinIcon() {
  return (
    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
      <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
    </span>
  );
}
