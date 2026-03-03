import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReferralSchema, insertStudentSchema, type ReferralInput, type StudentInput, type Student } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, LogIn, CheckCircle2, Copy } from "lucide-react";

export default function ReferralClient() {
  const [student, setStudent] = useState<Student | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

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
      // Generate code if empty
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

  if (!student) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Trimex Referral Portal</CardTitle>
            <CardDescription>Enter your student number to start referring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isRegistering ? (
              <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d.studentNumber))} className="space-y-4">
                <div className="space-y-2">
                  <Input placeholder="Student Number (e.g. 2024-XXXXX)" {...loginForm.register("studentNumber")} />
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {student.name}!</h1>
            <p className="text-muted-foreground">Ready to refer your friends to Trimex Colleges?</p>
          </div>
          <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 flex items-center justify-between gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> New Referral</CardTitle>
              <CardDescription>Tell us about the student you want to refer</CardDescription>
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
                    <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="09XX..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button className="w-full" size="lg" disabled={referralMutation.isPending}>
                    {referralMutation.isPending ? "Submitting..." : "Submit Referral"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              <p>1. <strong>Share your code:</strong> Give your unique code to friends and family.</p>
              <p>2. <strong>Refer a student:</strong> Fill out the form on the left with their details.</p>
              <p>3. <strong>Track Status:</strong> Our admissions team will contact them and you can track their enrollment status.</p>
              <div className="p-4 bg-secondary rounded-xl text-center">
                <p className="font-semibold text-primary">Earn incentives for every successful enrollee!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
