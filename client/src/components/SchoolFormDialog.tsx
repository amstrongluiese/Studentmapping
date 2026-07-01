import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { requestGeocodeSchoolOrThrow } from "@/lib/geocodeSchoolApi";
import type { School as SchoolRecord } from "@shared/schema";
import { hasCoordinates } from "@shared/schoolRegistry";
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
import { useCreateSchool, useSchools, useUpdateSchool } from "@/hooks/use-schools";
import {
  SchoolNameAutocomplete,
  type SchoolSearchSelection,
} from "@/components/SchoolNameAutocomplete";
import { Building2, Loader2, MapPin, School as SchoolIcon, Sparkles, Users } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface SchoolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: SchoolRecord | null;
  defaultCoordinates?: { lat: number; lng: number } | null;
}

export function SchoolFormDialog({
  open,
  onOpenChange,
  initialData,
  defaultCoordinates,
}: SchoolFormDialogProps) {
  const schoolsQuery = useSchools();
  const existingSchools = schoolsQuery.data || [];
  const createMutation = useCreateSchool();
  const updateMutation = useUpdateSchool();
  const { toast } = useToast();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const [geocodePreview, setGeocodePreview] = useState<string | null>(null);
  const [selectedSavedSchoolId, setSelectedSavedSchoolId] = useState<number | null>(null);
  const selectionConfirmedRef = useRef(false);

  const formSchema = api.schools.create.input.extend({
    municipality: z.string().trim().min(1, "Municipality is required"),
    institutionType: z.string().trim().min(1, "Institution type is required"),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    altitude: z.coerce.number().nullable().optional(),
    studentCount: z.coerce.number().int().min(0, "Student count must be 0 or more"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      municipality: "Laguna",
      province: "Laguna",
      institutionType: "Feeder Institution",
      lat: defaultCoordinates?.lat ?? 14.1667,
      lng: defaultCoordinates?.lng ?? 121.2500,
      altitude: null,
      studentCount: 0,
      verified: true,
      status: "Verified",
      source: "Manual Entry",
    },
  });

  useEffect(() => {
    if (open) {
      selectionConfirmedRef.current = Boolean(initialData);
      setSelectedSavedSchoolId(initialData?.id ?? null);
      setGeocodePreview(null);
      if (initialData) {
        form.reset({
          name: initialData.name,
          municipality: initialData.municipality || "Laguna",
          province: initialData.province || "Laguna",
          institutionType: initialData.institutionType || "Feeder Institution",
          lat: initialData.lat ?? 14.1667,
          lng: initialData.lng ?? 121.2500,
          altitude: initialData.altitude ?? null,
          studentCount: initialData.studentCount,
          verified: initialData.verified ?? true,
          status: (initialData.status || "Verified") as z.infer<typeof formSchema>["status"],
          source: initialData.source || "Manual Entry",
        });
      } else if (defaultCoordinates) {
        form.reset({
          name: "",
          municipality: "Laguna",
          province: "Laguna",
          institutionType: "Feeder Institution",
          lat: defaultCoordinates.lat,
          lng: defaultCoordinates.lng,
          altitude: null,
          studentCount: 0,
          verified: true,
          status: "Verified",
          source: "Manual Entry",
        });
      } else {
        form.reset({
          name: "",
          municipality: "Laguna",
          province: "Laguna",
          institutionType: "Feeder Institution",
          lat: 14.1667,
          lng: 121.2500,
          altitude: null,
          studentCount: 0,
          verified: true,
          status: "Verified",
          source: "Manual Entry",
        });
      }
    }
  }, [open, initialData, defaultCoordinates, form]);

  const applySchoolSelection = async (selection: SchoolSearchSelection) => {
    selectionConfirmedRef.current = true;

    if (selection.type === "registry") {
      const school = selection.school;
      setSelectedSavedSchoolId(school.id);
      form.setValue("name", school.name, { shouldDirty: true });
      form.setValue("municipality", school.municipality || "Laguna", { shouldDirty: true });
      form.setValue("province", school.province || "Laguna", { shouldDirty: true });
      form.setValue("institutionType", school.institutionType || "Feeder Institution", { shouldDirty: true });
      if (hasCoordinates(school)) {
        form.setValue("lat", school.lat!, { shouldDirty: true, shouldValidate: true });
        form.setValue("lng", school.lng!, { shouldDirty: true, shouldValidate: true });
        form.setValue("status", school.verified ? "Verified" : "Auto-Located", { shouldDirty: true });
        setGeocodePreview(school.name);
      } else {
        setGeocodePreview(`${school.name} — select Locate to fetch coordinates`);
      }
    }
  };

  const geolocateCurrentSchool = async () => {
    const name = form.getValues("name")?.trim();
    const municipality = form.getValues("municipality")?.trim() || undefined;

    if (!name || name.length < 2) {
      toast({
        title: "School name required",
        description: "Enter or select a school name before locating.",
        variant: "destructive",
      });
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await requestGeocodeSchoolOrThrow({ name, municipality });
      form.setValue("lat", result.lat, { shouldDirty: true, shouldValidate: true });
      form.setValue("lng", result.lng, { shouldDirty: true, shouldValidate: true });
      form.setValue("status", "Auto-Located", { shouldDirty: true });
      form.setValue("source", result.source === "Google Maps" ? "Google Geocoding Manual Assist" : "Geocoding Manual Assist", { shouldDirty: true });
      setGeocodePreview(result.displayName);
      selectionConfirmedRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to geolocate school.";
      toast({ title: "Geolocation failed", description: message, variant: "destructive" });
    } finally {
      setIsGeocoding(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const name = values.name?.trim();
    if (!name || name.length < 2) {
      toast({
        title: "School name required",
        description: "Select a suggestion or enter a complete school name before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        ...values,
        name,
        verified: values.verified ?? true,
        status: values.status || ("Verified" as const),
        source: values.source || initialData?.source || "Manual Entry",
      };
      const updateId = initialData?.id ?? selectedSavedSchoolId;
      if (updateId) {
        await updateMutation.mutateAsync({ id: updateId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // Mutation hook shows toast
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto overflow-x-visible p-0 border-0 shadow-2xl glass-panel">
        <div className="p-6 bg-gradient-to-br from-card/90 to-muted/80">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <SchoolIcon className="w-6 h-6 text-primary" />
              {initialData ? "Edit Origin School" : "Map New Origin School"}
            </DialogTitle>
            <DialogDescription>
              Search the local master directory first. Schools are not created while you type.
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
                    <SchoolNameAutocomplete
                      inputId="school-form-name"
                      value={field.value}
                      onValueChange={(next) => {
                        selectionConfirmedRef.current = false;
                        setSelectedSavedSchoolId(null);
                        field.onChange(next);
                        setGeocodePreview(null);
                      }}
                      onSelect={applySchoolSelection}
                      existingSchools={existingSchools}
                      placeholder="E.g. STI Calamba or Laguna Science High School"
                      inputClassName="h-10"
                    />
                    <FormDescription className="text-xs">
                      Use arrow keys, touch, or Enter to select.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="municipality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipality</FormLabel>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="Optional — E.g. Calamba" className="pl-9" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="Laguna" className="pl-9" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="institutionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution Type</FormLabel>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="Public High School" className="pl-9" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input type="number" step="any" className="pl-9" {...field} />
                        </FormControl>
                      </div>
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
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input type="number" step="any" className="pl-9" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="altitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(event.target.value === "" ? null : event.target.value)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Sparkles className="h-4 w-4" />
                      Geolocation (on demand)
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Locate previews coordinates until you save.
                    </p>
                    {geocodePreview ? (
                      <p className="mt-2 text-xs font-medium text-slate-700">Match: {geocodePreview}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 gap-2 bg-white"
                    disabled={isGeocoding || isResolvingPlace}
                    onClick={() => void geolocateCurrentSchool()}
                  >
                    {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    Locate
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="studentCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enrolled Students from this School</FormLabel>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-primary" />
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="pl-9 border-primary/20 focus-visible:ring-primary/20"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || isResolvingPlace} className="font-semibold shadow-lg shadow-primary/20">
                  {isPending || isResolvingPlace ? "Saving..." : initialData ? "Update School" : selectedSavedSchoolId ? "Update Verified School" : "Save School"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
