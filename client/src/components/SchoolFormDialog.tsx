import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, type SchoolInput } from "@shared/routes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateSchool, useUpdateSchool } from "@/hooks/use-schools";
import { MapPin, School, Users } from "lucide-react";
import { z } from "zod";

interface SchoolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: (SchoolInput & { id: number }) | null;
  defaultCoordinates?: { lat: number; lng: number } | null;
}

export function SchoolFormDialog({ 
  open, 
  onOpenChange, 
  initialData, 
  defaultCoordinates 
}: SchoolFormDialogProps) {
  const createMutation = useCreateSchool();
  const updateMutation = useUpdateSchool();

  // Extend schema to ensure numeric strings from inputs are coerced properly
  const formSchema = api.schools.create.input.extend({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    studentCount: z.coerce.number().min(0, "Student count must be 0 or more")
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      lat: defaultCoordinates?.lat ?? 14.1667,
      lng: defaultCoordinates?.lng ?? 121.2500,
      studentCount: 0,
    },
  });

  // Reset form when opening/closing or changing initial data
  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          name: initialData.name,
          lat: initialData.lat,
          lng: initialData.lng,
          studentCount: initialData.studentCount,
        });
      } else if (defaultCoordinates) {
        form.reset({
          name: "",
          lat: defaultCoordinates.lat,
          lng: defaultCoordinates.lng,
          studentCount: 0,
        });
      } else {
        form.reset({
          name: "",
          lat: 14.1667,
          lng: 121.2500,
          studentCount: 0,
        });
      }
    }
  }, [open, initialData, defaultCoordinates, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, ...values });
      } else {
        await createMutation.mutateAsync(values);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation hook's toast
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 border-0 shadow-2xl glass-panel">
        <div className="p-6 bg-gradient-to-br from-card/90 to-muted/80">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <School className="w-6 h-6 text-primary" />
              {initialData ? "Edit Origin School" : "Map New Origin School"}
            </DialogTitle>
            <DialogDescription>
              Record a senior high school where enrolled students originated from.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <School className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="E.g. Laguna Science High School" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input type="number" step="any" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lng"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input type="number" step="any" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="studentCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enrolled Students from this School</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Users className="absolute left-3 top-3 h-4 w-4 text-primary" />
                        <Input 
                          type="number" 
                          min={0}
                          className="pl-9 border-primary/20 focus-visible:ring-primary/20" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Total number of current enrollees from this institution.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="hover-elevate"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="bg-primary hover:bg-primary/90 hover-elevate active-elevate-2 font-semibold shadow-lg shadow-primary/20"
                >
                  {isPending ? "Saving..." : initialData ? "Update School" : "Save School"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
