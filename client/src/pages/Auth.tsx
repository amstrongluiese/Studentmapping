import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

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

  return (
    <div 
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950"
      onMouseMove={handleMouseMove}
    >
      {currentTheme === "antigravity" ? (
        <AntigravityTheme deptColors={deptColors} />
      ) : (
        <IridescentTheme mousePos={mousePos} deptColors={deptColors} />
      )}
      
      {/* Glass Card Container */}
      <Card className="relative z-10 w-[420px] border border-white/10 bg-black/40 shadow-[0_16px_40px_0_rgba(0,0,0,0.5)] backdrop-blur-2xl backdrop-saturate-200 rounded-3xl p-6 overflow-hidden transition-all duration-500">
        {/* Shine effect for frosted glass */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30 pointer-events-none"></div>
        <CardHeader className="relative z-20 pb-8">
          <CardTitle className="text-3xl text-center text-white font-bold tracking-tight drop-shadow-lg">Student Mapping</CardTitle>
        </CardHeader>
        <CardContent className="relative z-20">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300 text-[10px] font-semibold uppercase tracking-wider ml-1">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-black/40 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 rounded-xl h-12 px-4 shadow-inner transition-all hover:bg-black/50"
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 text-[10px] font-semibold uppercase tracking-wider ml-1">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-black/40 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 rounded-xl h-12 px-4 pr-12 shadow-inner transition-all hover:bg-black/50"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {loginError && (
              <div className="p-3 text-sm font-medium text-red-200 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2 backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                {loginError}
              </div>
            )}

            <Button type="submit" className="w-full h-12 mt-4 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold tracking-wide border-0 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:-translate-y-0.5">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
