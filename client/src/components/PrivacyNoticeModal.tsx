import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, Eye, AlertCircle } from "lucide-react";

export function PrivacyNoticeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("ra10173_privacy_consent");
    if (!consent) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("ra10173_privacy_consent", new Date().toISOString());
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-xl bg-slate-900 text-slate-100 border-slate-700 shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3 text-cyan-400">
            <ShieldCheck className="h-7 w-7 text-cyan-400" />
            <DialogTitle className="text-xl font-bold text-slate-100">
              Data Privacy Act (RA 10173) Compliance Notice
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300 text-sm leading-relaxed">
            In compliance with the **Philippine Data Privacy Act of 2012 (Republic Act No. 10173)**, this Student Mapping & Location Intelligence GIS System ensures the protection and confidentiality of student personal information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2 text-xs text-slate-300 bg-slate-800/80 p-4 rounded-lg border border-slate-700">
          <div className="flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block mb-0.5">1. Purpose Limitation (Sec. 11-b)</strong>
              Data collected is used exclusively for institutional admissions mapping, feeder school analysis, and educational planning.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Eye className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block mb-0.5">2. Data Minimization & Protection (Sec. 20)</strong>
              Personal Identifiable Information (PII) is encrypted, role-restricted, and monitored via immutable security audit logs.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block mb-0.5">3. Data Subject Rights (Sec. 16)</strong>
              Students hold the right to be informed, access, and request data anonymization or erasure upon request.
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between items-center gap-3 border-t border-slate-800 pt-4 mt-2">
          <span className="text-[11px] text-slate-400">
            Enforced by National Privacy Commission (NPC) Standards
          </span>
          <Button
            onClick={handleAccept}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 shadow-md transition-all"
          >
            I Understand & Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
