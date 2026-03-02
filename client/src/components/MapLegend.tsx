import { useSchools } from "@/hooks/use-schools";
import { Users, AlertCircle, TrendingUp, GraduationCap, MapPin } from "lucide-react";

export function MapLegend() {
  const { data: schools } = useSchools();
  
  if (!schools || schools.length === 0) return null;

  const totalStudents = schools.reduce((sum, s) => sum + s.studentCount, 0);
  const sortedSchools = [...schools].sort((a, b) => b.studentCount - a.studentCount);
  const averageEnrollment = Math.round(totalStudents / schools.length);

  return (
    <div className="absolute bottom-6 right-6 z-[1000] glass-panel rounded-2xl p-5 min-w-[300px] max-h-[80vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-8 fade-in duration-500 hidden md:block border-t-4 border-t-primary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <MapPinIcon />
          Analytics Summary
        </h3>
      </div>
      
      <div className="space-y-4">
        {/* Total Stats Card */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 flex flex-col items-center text-center">
            <Users className="w-4 h-4 text-primary mb-1" />
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Total Enrollees</p>
            <p className="text-lg font-black text-primary">{totalStudents.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-xl border border-border flex flex-col items-center text-center">
            <GraduationCap className="w-4 h-4 text-muted-foreground mb-1" />
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Avg per School</p>
            <p className="text-lg font-black text-foreground">{averageEnrollment}</p>
          </div>
        </div>

        {/* Top Schools List */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Top Source Schools</p>
          <div className="space-y-1.5">
            {sortedSchools.slice(0, 3).map((school, i) => (
              <div key={school.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors group">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i + 1}
                  </div>
                  <p className="text-xs font-semibold truncate" title={school.name}>{school.name}</p>
                </div>
                <p className="text-xs font-bold text-primary ml-2">{school.studentCount}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <p>Real-time data from {schools.length} origin schools.</p>
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
