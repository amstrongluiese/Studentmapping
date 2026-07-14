import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { type SchoolRegistry as SchoolRecord } from "@shared/schema";
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
import { Loader2, MapPin, School as SchoolIcon, Sparkles, Navigation } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const libraries: "places"[] = ["places"];

const LAGUNA_CENTER = { lat: 14.1667, lng: 121.25 };

interface SchoolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: SchoolRecord | null;
  defaultCoordinates?: { latitude: number; longitude: number } | null;
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
  const [geocodePreview, setGeocodePreview] = useState<string | null>(null);
  const [selectedSavedSchoolId, setSelectedSavedSchoolId] = useState<number | null>(null);
  const selectionConfirmedRef = useRef(false);
  const [mapCenter, setMapCenter] = useState(LAGUNA_CENTER);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const formSchema = api.schoolRegistry.create.input.extend({
    municipality: z.string().trim().min(1, "Municipality is required"),
    institutionType: z.string().trim().min(1, "Institution type is required"),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    altitude: z.coerce.number().nullable().optional(),
    studentCount: z.coerce.number().int().min(0, "Student count must be 0 or more"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: "",
      municipality: "",
      province: "Laguna",
      institutionType: "Feeder Institution",
      latitude: defaultCoordinates?.latitude ?? LAGUNA_CENTER.lat,
      longitude: defaultCoordinates?.longitude ?? LAGUNA_CENTER.lng,
      altitude: null,
      studentCount: 0,
      isActive: true,
      source: "Manual Entry",
    },
  });

  const latVal = form.watch("latitude");
  const lngVal = form.watch("longitude");

  // Sync marker when lat/lng fields change
  useEffect(() => {
    if (latVal && lngVal && !isNaN(Number(latVal)) && !isNaN(Number(lngVal))) {
      const pos = { lat: Number(latVal), lng: Number(lngVal) };
      setMarkerPos(pos);
    }
  }, [latVal, lngVal]);

  useEffect(() => {
    if (open) {
      selectionConfirmedRef.current = Boolean(initialData);
      setSelectedSavedSchoolId(initialData?.id ?? null);
      setGeocodePreview(null);
      
      const lat = initialData?.latitude ?? defaultCoordinates?.latitude ?? LAGUNA_CENTER.lat;
      const lng = initialData?.longitude ?? defaultCoordinates?.longitude ?? LAGUNA_CENTER.lng;
      
      setMapCenter({ lat, lng });
      setMarkerPos({ lat, lng });

      if (initialData) {
        form.reset({
          schoolName: initialData.schoolName,
          municipality: initialData.municipality || "Laguna",
          province: initialData.province || "Laguna",
          institutionType: initialData.schoolType || "Feeder Institution",
          latitude: lat,
          longitude: lng,
          altitude: null,
          studentCount: 0,
          isActive: initialData.isActive ?? true,
          source: initialData.source || "Manual Entry",
        });
      } else if (defaultCoordinates) {
        form.reset({
          schoolName: "",
          municipality: "",
          province: "Laguna",
          institutionType: "Feeder Institution",
          latitude: defaultCoordinates.latitude,
          longitude: defaultCoordinates.longitude,
          altitude: null,
          studentCount: 0,
          isActive: true,
          source: "Manual Entry",
        });
      } else {
        form.reset({
          schoolName: "",
          municipality: "",
          province: "Laguna",
          institutionType: "Feeder Institution",
          latitude: LAGUNA_CENTER.lat,
          longitude: LAGUNA_CENTER.lng,
          altitude: null,
          studentCount: 0,
          isActive: true,
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
      form.setValue("schoolName", school.schoolName, { shouldDirty: true });
      form.setValue("municipality", school.municipality || "Laguna", { shouldDirty: true });
      form.setValue("province", school.province || "Laguna", { shouldDirty: true });
      form.setValue("institutionType", school.schoolType || "Feeder Institution", { shouldDirty: true });
      if (hasCoordinates(school)) {
        form.setValue("latitude", school.latitude!, { shouldDirty: true, shouldValidate: true });
        form.setValue("longitude", school.longitude!, { shouldDirty: true, shouldValidate: true });
        form.setValue("isActive", true, { shouldDirty: true });
        const pos = { lat: school.latitude!, lng: school.longitude! };
        setMarkerPos(pos);
        setMapCenter(pos);
        setGeocodePreview(school.schoolName);
      } else {
        setGeocodePreview(`${school.schoolName} — click Locate to fetch coordinates`);
      }
    }
  };

  // When user clicks on the map, move the pin and update form fields
  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });
    form.setValue("latitude", lat, { shouldDirty: true, shouldValidate: true });
    form.setValue("longitude", lng, { shouldDirty: true, shouldValidate: true });
    setGeocodePreview(`Manual pin: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }, [form]);

  const geolocateCurrentSchool = async () => {
    const name = form.getValues("schoolName")?.trim();
    const municipality = form.getValues("municipality")?.trim() || undefined;

    if (!name || name.length < 2) {
      toast({
        title: "School name required",
        description: "Enter or select a school name before locating.",
        variant: "destructive",
      });
      return;
    }

    if (!window.google || !window.google.maps) {
      toast({ title: "Maps not ready", description: "Google Maps not loaded yet.", variant: "destructive" });
      return;
    }

    setIsGeocoding(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const currentMunicipality = form.getValues("municipality")?.trim();
      const searchQuery = currentMunicipality
        ? `${name}, ${currentMunicipality}, Philippines`
        : `${name}, Philippines`;

      const response = await geocoder.geocode({ address: searchQuery, region: "ph" });
      if (!response.results || response.results.length === 0) throw new Error("No results found on Google Maps.");

      const res = response.results[0];
      const lat = res.geometry.location.lat();
      const lng = res.geometry.location.lng();
      
      // Extract municipality and province from address components
      let detectedMunicipality = "";
      let detectedProvince = "";
      for (const comp of res.address_components) {
        if (comp.types.includes("locality")) {
          detectedMunicipality = comp.long_name;
        }
        if (comp.types.includes("administrative_area_level_2")) {
          detectedProvince = comp.long_name;
        }
        if (!detectedProvince && comp.types.includes("administrative_area_level_1")) {
          detectedProvince = comp.long_name;
        }
      }

      form.setValue("latitude", lat, { shouldDirty: true, shouldValidate: true });
      form.setValue("longitude", lng, { shouldDirty: true, shouldValidate: true });
      form.setValue("isActive", true, { shouldDirty: true });
      form.setValue("source", "Google Geocoding Manual Assist", { shouldDirty: true });
      if (detectedMunicipality) {
        form.setValue("municipality", detectedMunicipality, { shouldDirty: true });
      }
      if (detectedProvince) {
        form.setValue("province", detectedProvince, { shouldDirty: true });
      }

      const pos = { lat, lng };
      setMarkerPos(pos);
      setMapCenter(pos);
      setGeocodePreview(res.formatted_address);
      selectionConfirmedRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to geolocate school.";
      toast({ title: "Geolocation failed", description: message, variant: "destructive" });
    } finally {
      setIsGeocoding(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const name = values.schoolName?.trim();
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
        verified: values.isActive ?? true,
        isActive: values.isActive || (true as const),
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
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto overflow-x-visible p-0 border-0 shadow-2xl glass-panel">
        <div className="p-6 bg-gradient-to-br from-card/90 to-muted/80">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <SchoolIcon className="w-6 h-6 text-primary" />
              {initialData ? "Edit Origin School" : "Map New Origin School"}
            </DialogTitle>
            <DialogDescription>
              Search the local master directory first. Click on the map to place the pin manually, or use Locate.
            </DialogDescription>
          </DialogHeader>

          <Form {...(form as any)}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
              <FormField
                control={form.control as any}
                name="schoolName"
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
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="municipality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipality</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Biñan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Laguna" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Mini Map */}
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                    Location Pin — click map to adjust
                  </p>
                  {markerPos && (
                    <span className="font-mono text-[10px] text-slate-500">
                      {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}
                    </span>
                  )}
                </div>
                <div className="h-[220px] w-full bg-slate-100">
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={mapCenter}
                      zoom={markerPos ? 14 : 11}
                      onClick={onMapClick}
                      options={{
                        disableDefaultUI: true,
                        zoomControl: true,
                        mapTypeControl: false,
                        streetViewControl: false,
                        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
                      }}
                    >
                      {markerPos && (
                        <Marker
                          position={markerPos}
                          draggable
                          onDragEnd={(e) => {
                            if (!e.latLng) return;
                            const lat = e.latLng.lat();
                            const lng = e.latLng.lng();
                            setMarkerPos({ lat, lng });
                            form.setValue("latitude", lat, { shouldDirty: true, shouldValidate: true });
                            form.setValue("longitude", lng, { shouldDirty: true, shouldValidate: true });
                            setGeocodePreview(`Manual pin: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                          }}
                        />
                      )}
                    </GoogleMap>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading map…
                    </div>
                  )}
                </div>
              </div>

              {/* Coordinates read-only display */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="14.xxxx" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="121.xxxx" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Geocode action */}
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Sparkles className="h-4 w-4" />
                      Auto-Locate via Google Maps
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Or click directly on the map / drag the pin to set manually.
                    </p>
                    {geocodePreview && (
                      <p className="mt-2 text-xs font-medium text-slate-700">
                        <Navigation className="h-3 w-3 inline mr-1 text-indigo-500" />
                        {geocodePreview}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 gap-2 bg-white"
                    disabled={isGeocoding}
                    onClick={() => void geolocateCurrentSchool()}
                  >
                    {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    Locate
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="institutionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Feeder Institution" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Manual Entry" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="font-semibold shadow-lg shadow-primary/20">
                  {isPending ? "Saving..." : initialData ? "Update School" : selectedSavedSchoolId ? "Update Verified School" : "Save School"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
