import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReferralSchema, insertStudentSchema, type Referral, type ReferralInput, type StudentInput, type Student } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Clock3, LogIn, CheckCircle2, Copy, UserCheck, UserPlus, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function ReferralClient() {
  const [student, setStudent] = useState<Student | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();
  const { data: allReferrals = [] } = useQuery<Referral[]>({
    queryKey: [api.referrals.list.path],
    enabled: Boolean(student),
  });
  const studentReferrals = useMemo(
    () => allReferrals.filter((referral) => referral.referrerId === student?.id),
    [allReferrals, student?.id],
  );
  const referralStats = useMemo(() => ({
    total: studentReferrals.length,
    pending: studentReferrals.filter((referral) => referral.status === "pending").length,
    approved: studentReferrals.filter((referral) => referral.status === "approved").length,
    rejected: studentReferrals.filter((referral) => referral.status === "rejected").length,
  }), [studentReferrals]);

  const loginForm = useForm<{ studentNumber: string }>({
    defaultValues: { studentNumber: "" }
  });

  const registerForm = useForm<StudentInput>({
    resolver: zodResolver(insertStudentSchema),
    defaultValues: { studentNumber: "", name: "", referralCode: "" }
  });

  const referralForm = useForm<ReferralInput>({
    resolver: zodResolver(insertReferralSchema),
    defaultValues: {
      referrerId: undefined,
      referredName: "",
      relationship: "",
      contactNumber: "",
      status: "pending"
    }
  });

  const publicReferralForm = useForm<ReferralInput & { referralCode: string }>({
    resolver: zodResolver(insertReferralSchema.extend({ referralCode: insertStudentSchema.shape.referralCode })),
    defaultValues: {
      referralCode: "",
      referredName: "",
      relationship: "",
      contactNumber: "",
      status: "pending"
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (studentNumber: string) => {
      const res = await fetch(buildUrl(api.students.getByNumber.path, { studentNumber }));
      if (!res.ok) throw new Error("Student not found. Please register.");
      return res.json();
    },
    onSuccess: (data) => {
      setStudent(data);
      referralForm.setValue("referrerId", data.id);
      toast({ title: "Welcome back!", description: `Hello, ${data.name}` });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: StudentInput) => {
      if (!data.referralCode) {
        data.referralCode = `TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
      const res = await fetch(api.students.register.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Registration failed.");
      return res.json();
    },
    onSuccess: (data) => {
      setStudent(data);
      referralForm.setValue("referrerId", data.id);
      toast({ title: "Success!", description: "You are now registered for the referral system." });
    }
  });

  const referralMutation = useMutation({
    mutationFn: async (data: ReferralInput) => {
      const res = await fetch(api.referrals.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit referral.");
      return res.json();
    },
    onSuccess: () => {
      referralForm.reset({ referrerId: student?.id, status: "pending" });
      toast({ title: "Referral Sent", description: "Thank you for referring a student!" });
    }
  });

  const publicReferralMutation = useMutation({
    mutationFn: async (data: ReferralInput & { referralCode: string }) => {
      // 1. Validate referral code and get student
      const studentRes = await fetch(buildUrl(api.students.getByCode.path, { referralCode: data.referralCode }));
      if (!studentRes.ok) throw new Error("Invalid referral code.");
      const studentData = await studentRes.json();
      
      // 2. Submit referral linked to that student
      const referralData = {
        referrerId: studentData.id,
        referredName: data.referredName,
        relationship: data.relationship,
        contactNumber: data.contactNumber,
        status: "pending"
      };
      
      const res = await fetch(api.referrals.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(referralData),
      });
      if (!res.ok) throw new Error("Failed to submit referral.");
      return res.json();
    },
    onSuccess: () => {
      publicReferralForm.reset();
      toast({ title: "Referral Submitted", description: "Your referral has been sent for approval." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    }
  });

  if (!student) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <Tabs defaultValue="login">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <LogIn className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Trimex Referral Portal</CardTitle>
              <CardDescription>Register, share your code, and track referred students</CardDescription>
              <TabsList className="grid w-full grid-cols-2 mt-4">
                <TabsTrigger value="login">Student Portal</TabsTrigger>
                <TabsTrigger value="public">Public Entry</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="login" className="space-y-6 m-0">
                {!isRegistering ? (
                  <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d.studentNumber))} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        id="referral-login-student-number"
                        autoComplete="username"
                        placeholder="Student Number (e.g. 2024-XXXXX)"
                        {...loginForm.register("studentNumber")}
                      />
                    </div>
                    <Button className="w-full" size="lg" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? "Checking..." : "Access Portal"}
                    </Button>
                    <div className="text-center">
                      <button type="button" onClick={() => setIsRegistering(true)} className="text-sm text-primary hover:underline">
                        Not yet registered? Register here.
                      </button>
                    </div>
                  </form>
                ) : (
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit((d) => registerMutation.mutate(d))} className="space-y-4">
                      <FormField control={registerForm.control} name="studentNumber" render={({ field }) => (
                        <FormItem><FormLabel>Student Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={registerForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <Button className="w-full" size="lg" disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? "Registering..." : "Register & Get Code"}
                      </Button>
                      <div className="text-center">
                        <button type="button" onClick={() => setIsRegistering(false)} className="text-sm text-muted-foreground hover:underline">
                          Already registered? Back to Login.
                        </button>
                      </div>
                    </form>
                  </Form>
                )}
              </TabsContent>
              <TabsContent value="public" className="space-y-6 m-0">
                <Form {...publicReferralForm}>
                  <form onSubmit={publicReferralForm.handleSubmit((d) => publicReferralMutation.mutate(d))} className="space-y-4">
                    <FormField control={publicReferralForm.control} name="referralCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referral Code</FormLabel>
                        <div className="relative">
                          <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <FormControl>
                            <Input placeholder="Enter TRX-XXXXXX" className="pl-9" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={publicReferralForm.control} name="referredName" render={({ field }) => (
                      <FormItem><FormLabel>Candidate Name</FormLabel><FormControl><Input placeholder="Full name of referred student" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={publicReferralForm.control} name="relationship" render={({ field }) => (
                      <FormItem><FormLabel>Relationship to Referrer</FormLabel><FormControl><Input placeholder="e.g. Friend, Cousin" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={publicReferralForm.control} name="contactNumber" render={({ field }) => (
                      <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="09XX..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button className="w-full" size="lg" disabled={publicReferralMutation.isPending}>
                      {publicReferralMutation.isPending ? "Submitting..." : "Submit Referral"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {student.name}!</h1>
            <p className="text-muted-foreground">Submit referrals, share your code, and track each lead through admissions review.</p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-white p-4 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Your Referral Code</p>
              <p className="text-2xl font-black text-primary tracking-tight">{student.referralCode}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => {
              navigator.clipboard.writeText(student.referralCode);
              toast({ title: "Copied!", description: "Referral code copied to clipboard." });
            }}><Copy className="w-5 h-5" /></Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <StudentReferralMetric label="Total" value={referralStats.total} />
          <StudentReferralMetric label="Pending" value={referralStats.pending} tone="amber" />
          <StudentReferralMetric label="Approved" value={referralStats.approved} tone="emerald" />
          <StudentReferralMetric label="Rejected" value={referralStats.rejected} tone="rose" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="rounded-lg border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> New Referral</CardTitle>
              <CardDescription>Submit one candidate per referral so admissions can review clearly.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...referralForm}>
                <form onSubmit={referralForm.handleSubmit((d) => referralMutation.mutate(d))} className="space-y-4">
                  <FormField control={referralForm.control} name="referredName" render={({ field }) => (
                    <FormItem><FormLabel>Candidate Name</FormLabel><FormControl><Input placeholder="Candidate Name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={referralForm.control} name="relationship" render={({ field }) => (
                    <FormItem><FormLabel>Relationship</FormLabel><FormControl><Input placeholder="e.g. Friend, Cousin" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={referralForm.control} name="contactNumber" render={({ field }) => (
                    <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="09XX..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button className="w-full" size="lg" disabled={referralMutation.isPending}>
                    {referralMutation.isPending ? "Submitting..." : "Submit Referral"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock3 className="w-5 h-5 text-primary" /> Referral Status</CardTitle>
              <CardDescription>Admissions will move each referral from pending to approved or rejected.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentReferrals.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-muted-foreground">
                  No referrals yet. Submit a candidate or share your code with someone applying to Trimex.
                </div>
              ) : studentReferrals.map((referral) => (
                <div key={referral.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{referral.referredName}</p>
                      <p className="text-xs text-muted-foreground">{referral.relationship}</p>
                      {referral.contactNumber ? <p className="mt-1 text-xs text-muted-foreground">{referral.contactNumber}</p> : null}
                    </div>
                    <StudentReferralStatus status={referral.status} />
                  </div>
                </div>
              ))}

              <div className="rounded-lg border border-primary/15 bg-primary/5 p-4 text-sm">
                <p className="font-semibold text-primary">Logical flow</p>
                <p className="mt-1 text-muted-foreground">Share code, submit candidate, admissions follow-up, then approval after qualification.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StudentReferralMetric({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "amber" | "emerald" | "rose";
}) {
  const toneClass = {
    primary: "border-primary/15 bg-primary/5 text-primary",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  }[tone];

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value.toLocaleString()}</p>
    </div>
  );
}

function StudentReferralStatus({ status }: { status: string }) {
  const icon = status === "approved"
    ? <CheckCircle2 className="h-3.5 w-3.5" />
    : status === "rejected"
      ? <XCircle className="h-3.5 w-3.5" />
      : <Clock3 className="h-3.5 w-3.5" />;
  const tone = status === "approved"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "rejected"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  const label = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";

  return <Badge variant="outline" className={`gap-1 ${tone}`}>{icon}{label}</Badge>;
}
