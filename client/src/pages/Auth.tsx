import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, MapPin, GraduationCap, School, Users, Compass, BookOpen, Award, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Theme Components ---

function IridescentTheme({ mousePos, deptColors }: { mousePos: { x: number, y: number }, deptColors: string[] }) {
  const defaultColors = [
    "#e11d48", "#2563eb", "#0f766e", "#64748b", "#d97706", "#7c3aed"
  ];
  const getBlobGradient = (index: number) => {
    const colors = deptColors.length > 0 ? deptColors : defaultColors;
    const c1 = colors[index % colors.length];
    const c2 = colors[(index + 1) % colors.length];
    const c3 = colors[(index + 2) % colors.length];
    return `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob-movement {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(30px, -50px) scale(1.1) rotate(10deg); }
          66% { transform: translate(-20px, 20px) scale(0.9) rotate(-10deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
        }
        @keyframes morph {
          0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 70% 70% 30% / 30% 60% 40% 70%; }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        }
        @keyframes morph-reverse {
          0% { border-radius: 30% 70% 70% 30% / 30% 60% 40% 70%; }
          50% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          100% { border-radius: 30% 70% 70% 70% / 30% 60% 40% 70%; }
        }
        .animate-organic-blob {
          animation: blob-movement 15s infinite ease-in-out, morph 8s infinite ease-in-out;
        }
        .animate-organic-blob-reverse {
          animation: blob-movement 18s infinite ease-in-out reverse, morph-reverse 10s infinite ease-in-out;
        }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}} />
      
      <div className="absolute bottom-[10%] left-[5%] transition-transform duration-700 ease-out" style={{ transform: `translate(${mousePos.x * -50}px, ${mousePos.y * -50}px)` }}>
        <div className="w-[500px] h-[500px] mix-blend-screen filter blur-[35px] opacity-80 animate-organic-blob shadow-[inset_0_0_50px_rgba(0,0,0,0.2)]" style={{ background: getBlobGradient(0) }}></div>
      </div>
      <div className="absolute top-[20%] right-[5%] transition-transform duration-1000 ease-out" style={{ transform: `translate(${mousePos.x * 70}px, ${mousePos.y * 70}px)` }}>
        <div className="w-[450px] h-[450px] mix-blend-screen filter blur-[40px] opacity-70 animate-organic-blob-reverse animation-delay-2000" style={{ background: getBlobGradient(1) }}></div>
      </div>
      <div className="absolute -bottom-32 left-[20%] transition-transform duration-1000 ease-out" style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)` }}>
        <div className="w-[1200px] h-[900px] mix-blend-screen filter blur-[45px] opacity-60 animate-organic-blob animation-delay-4000" style={{ background: getBlobGradient(2) }}></div>
      </div>
      <div className="absolute -top-10 -left-10 transition-transform duration-700 ease-out" style={{ transform: `translate(${mousePos.x * -80}px, ${mousePos.y * -80}px)` }}>
        <div className="w-[600px] h-[600px] mix-blend-screen filter blur-[40px] opacity-60 animate-organic-blob shadow-[inset_0_0_30px_rgba(0,0,0,0.1)]" style={{ background: getBlobGradient(3) }}></div>
      </div>
      <div className="absolute top-[40%] left-[45%] transition-transform ease-out" style={{ transitionDuration: '1200ms', transform: `translate(${mousePos.x * 100}px, ${mousePos.y * 100}px)` }}>
        <div className="w-[300px] h-[300px] mix-blend-screen filter blur-[25px] opacity-90 animate-organic-blob-reverse animation-delay-2000" style={{ background: getBlobGradient(4) }}></div>
      </div>
      <div className="absolute -bottom-20 -right-20 transition-transform duration-1000 ease-out" style={{ transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)` }}>
        <div className="w-[700px] h-[700px] mix-blend-screen filter blur-[50px] opacity-70 animate-organic-blob" style={{ background: getBlobGradient(5) }}></div>
      </div>
    </>
  );
}

const EMPTY_COLORS: string[] = [];

function AntigravityTheme({ deptColors }: { deptColors: string[] }) {
  const defaultColors = ["#e11d48", "#2563eb", "#0f766e", "#64748b", "#d97706", "#7c3aed", "#10b981", "#ec4899", "#8b5cf6"];
  const colors = deptColors.length > 0 ? deptColors : defaultColors;
  const colorsKey = colors.join(",");
  
  // Generate particles
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 60 }).map((_, i) => {
      const size = Math.random() * 8 + 4; // 4px to 12px
      return {
        id: i,
        x: Math.random() * 100, // vw
        y: Math.random() * 100, // vh
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: Math.random() * 20 + 10, // 10s to 30s
        delay: Math.random() * -20, // Start at different times
        tx: (Math.random() - 0.5) * 400, // drift x
        ty: (Math.random() - 0.5) * 400, // drift y
      };
    });
    setParticles(generated);
  }, [colorsKey]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drift {
          0% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50% { transform: translate(var(--tx), var(--ty)) scale(1.5); opacity: 0.8; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
        }
      `}} />
      <div className="absolute inset-0 bg-slate-950 overflow-hidden">
        {/* Subtle grid background for matrix feel */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
        
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full shadow-[0_0_15px_currentColor]"
            style={{
              left: `${p.x}vw`,
              top: `${p.y}vh`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              color: p.color,
              animation: `drift ${p.duration}s infinite ease-in-out`,
              animationDelay: `${p.delay}s`,
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
            } as any}
          />
        ))}
      </div>
    </>
  );
}

function StudentMappingTheme() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-node-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(4deg); }
        }
        @keyframes float-node-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-22px) rotate(-5deg); }
        }
        @keyframes float-node-3 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        .animate-float-1 { animation: float-node-1 7s ease-in-out infinite; }
        .animate-float-2 { animation: float-node-2 9s ease-in-out infinite 1s; }
        .animate-float-3 { animation: float-node-3 8s ease-in-out infinite 2s; }
        .animate-pulse-glow { animation: pulse-glow 5s ease-in-out infinite; }
      `}} />

      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 overflow-hidden">
        {/* Subtle architectural grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px]"></div>

        {/* Ambient colored background glows */}
        <div className="absolute top-1/4 left-1/6 w-[450px] h-[450px] bg-indigo-200/50 rounded-full blur-3xl animate-pulse-glow pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/6 w-[450px] h-[450px] bg-purple-200/50 rounded-full blur-3xl animate-pulse-glow pointer-events-none" style={{ animationDelay: '2.5s' }}></div>

        {/* Constellation SVG lines connecting nodes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <line x1="14%" y1="24%" x2="26%" y2="40%" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 5" />
          <line x1="26%" y1="40%" x2="18%" y2="66%" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="5 5" />
          <line x1="18%" y1="66%" x2="32%" y2="82%" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="5 5" />
          <line x1="74%" y1="18%" x2="86%" y2="34%" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 5" />
          <line x1="86%" y1="34%" x2="78%" y2="60%" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 5" />
          <line x1="78%" y1="60%" x2="88%" y2="80%" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 5" />
          <line x1="74%" y1="18%" x2="62%" y2="38%" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 5" />
        </svg>

        {/* Left Side Floating Student Mapping Nodes */}
        {/* Node 1: MapPin (Location) */}
        <div className="absolute top-[22%] left-[12%] animate-float-1">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-500/25 ring-4 ring-white/80 hover:scale-110 transition-transform cursor-pointer">
            <MapPin className="w-8 h-8" />
          </div>
        </div>

        {/* Node 2: GraduationCap (Scholar) */}
        <div className="absolute top-[38%] left-[25%] animate-float-2">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-violet-600 text-white shadow-xl shadow-violet-500/25 ring-4 ring-white/80 hover:scale-110 transition-transform cursor-pointer">
            <GraduationCap className="w-10 h-10" />
          </div>
        </div>

        {/* Node 3: School (Campus) */}
        <div className="absolute top-[62%] left-[16%] animate-float-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/25 ring-4 ring-white/80 hover:scale-110 transition-transform cursor-pointer">
            <School className="w-7 h-7" />
          </div>
        </div>

        {/* Node 4: Users (Student Cohort) */}
        <div className="absolute top-[78%] left-[30%] animate-float-1">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-500 text-white shadow-xl shadow-amber-500/25 ring-4 ring-white/80 hover:scale-110 transition-transform cursor-pointer">
            <Users className="w-8 h-8" />
          </div>
        </div>

        {/* Right Side Floating Student Mapping Nodes */}
        {/* Node 5: Compass (GIS Navigation) */}
        <div className="absolute top-[18%] right-[24%] animate-float-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-500/25 ring-4 ring-white/80 hover:scale-110 transition-transform cursor-pointer">
            <Compass className="w-8 h-8" />
          </div>
        </div>

        {/* Node 6: Award / Scholarship */}
        <div className="absolute top-[32%] right-[12%] animate-float-3">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/25 ring-4 ring-white/80 hover:scale-110 transition-transform cursor-pointer">
            <Award className="w-10 h-10" />
          </div>
        </div>

        {/* Node 7: BookOpen (Education) */}
        <div className="absolute top-[58%] right-[20%] animate-float-1">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-cyan-600 text-white shadow-xl shadow-cyan-500/25 ring-4 ring-white/80 hover:scale-110 transition-transform cursor-pointer">
            <BookOpen className="w-8 h-8" />
          </div>
        </div>

        {/* Node 8: Building (University) */}
        <div className="absolute top-[76%] right-[10%] animate-float-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-teal-500 text-white shadow-xl shadow-teal-500/25 ring-4 ring-white/80 hover:scale-110 transition-transform cursor-pointer">
            <Building2 className="w-7 h-7" />
          </div>
        </div>

        {/* Decorative Floating Dots */}
        <div className="absolute top-[15%] left-[28%] w-3 h-3 rounded-full bg-indigo-400 animate-pulse"></div>
        <div className="absolute top-[48%] left-[8%] w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
        <div className="absolute top-[72%] left-[26%] w-4 h-4 rounded-full bg-amber-400 animate-pulse"></div>
        <div className="absolute top-[28%] right-[28%] w-3.5 h-3.5 rounded-full bg-blue-400 animate-pulse"></div>
        <div className="absolute top-[50%] right-[10%] w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></div>
        <div className="absolute top-[82%] right-[24%] w-3 h-3 rounded-full bg-violet-400 animate-pulse"></div>
      </div>
    </>
  );
}

// --- Main Page ---

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { login, user } = useAuth();

  const { data: departments } = useQuery<any[]>({ queryKey: ["/api/departments"] });
  const deptColors = React.useMemo(() => departments?.map(d => d.color).filter(Boolean) || EMPTY_COLORS, [departments]);

  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
  const currentTheme = settings?.login_theme || "anek"; // default to "anek" (Iridescent)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (currentTheme !== "anek") return;
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth - 0.5) * 2;
    const y = (clientY / window.innerHeight - 0.5) * 2;
    setMousePos({ x, y });
  };

  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      await login({ username, password });
    } catch (err: any) {
      setLoginError(err.message || "An error occurred during login.");
    }
  };

  const isLightMode = currentTheme === "mapping_network";

  return (
    <div 
      className={cn("relative min-h-screen flex items-center justify-center overflow-hidden", isLightMode ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-white")}
      onMouseMove={handleMouseMove}
    >
      {currentTheme === "mapping_network" ? (
        <StudentMappingTheme />
      ) : currentTheme === "antigravity" ? (
        <AntigravityTheme deptColors={deptColors} />
      ) : (
        <IridescentTheme mousePos={mousePos} deptColors={deptColors} />
      )}
      
      {/* Glass Card Container */}
      <Card className={cn(
        "relative z-10 w-[420px] rounded-3xl p-6 overflow-hidden transition-all duration-500",
        isLightMode 
          ? "border border-slate-200/80 bg-white/90 shadow-[0_25px_60px_-15px_rgba(99,102,241,0.15)] backdrop-blur-xl"
          : "border border-white/15 bg-white/[0.03] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-[8px] backdrop-saturate-200"
      )}>
        {/* Shine effect for frosted glass */}
        <div className={cn("absolute inset-0 pointer-events-none opacity-30", isLightMode ? "bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent" : "bg-gradient-to-br from-white/10 via-transparent to-transparent")}></div>
        <CardHeader className="relative z-20 pb-8">
          <CardTitle className={cn("text-3xl text-center font-bold tracking-tight drop-shadow-lg", isLightMode ? "text-slate-900" : "text-white")}>
            Student Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-20">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className={cn("text-[10px] font-semibold uppercase tracking-wider ml-1", isLightMode ? "text-slate-600" : "text-slate-300")}>
                Username
              </Label>
              <Input
                id="username"
                name="username"
                aria-label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={cn(
                  "rounded-xl h-12 px-4 shadow-inner transition-all",
                  isLightMode 
                    ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 hover:bg-slate-100/80" 
                    : "bg-black/40 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 hover:bg-black/50"
                )}
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className={cn("text-[10px] font-semibold uppercase tracking-wider ml-1", isLightMode ? "text-slate-600" : "text-slate-300")}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  aria-label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={cn(
                    "rounded-xl h-12 px-4 pr-12 shadow-inner transition-all",
                    isLightMode 
                      ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 hover:bg-slate-100/80" 
                      : "bg-black/40 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 hover:bg-black/50"
                  )}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors focus:outline-none", isLightMode ? "text-slate-400 hover:text-slate-700" : "text-slate-400 hover:text-white")}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {loginError && (
              <div className="p-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                {loginError}
              </div>
            )}

            <Button 
              type="submit" 
              className={cn(
                "w-full h-12 mt-4 font-bold tracking-wide border-0 rounded-xl transition-all duration-300 shadow-lg hover:-translate-y-0.5",
                isLightMode 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40" 
                  : "bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]"
              )}
            >
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
