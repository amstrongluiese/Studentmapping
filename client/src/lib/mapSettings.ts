import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

export const LAGUNA_CENTER: LatLngExpression = [14.1667, 121.25];
export const LAGUNA_BOUNDS: LatLngBoundsExpression = [
  [13.78, 120.88],
  [14.58, 121.72],
];

export const PHILIPPINES_BOUNDS: LatLngBoundsExpression = [
  [4.5, 116.9],
  [21.5, 126.6],
];

// OpenStreetMap & CARTO tile configurations
// OpenStreetMap tiles are standard, free, and have no "API KEY REQUIRED" watermark
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

// Clean, professional GIS basemap configurations with ZERO watermarks
export const ESRI_WORLD_STREET_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
export const ESRI_WORLD_TOPO_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
export const ESRI_LIGHT_GRAY_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const ESRI_DARK_GRAY_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const ESRI_WORLD_IMAGERY_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const ESRI_ATTRIBUTION = "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom";
export const ESRI_IMAGERY_ATTRIBUTION = "Tiles &copy; Esri &mdash; DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community";

export const ESRI_NATGEO_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}";
export const NATGEO_ATTRIBUTION = "Tiles &copy; Esri &mdash; National Geographic, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC";

export type BasemapStyle = "street" | "minimal" | "topo" | "satellite" | "dark" | "osm" | "natgeo";

export interface BasemapOption {
  id: BasemapStyle;
  name: string;
  category: "Clean GIS" | "Aesthetic" | "Satellite" | "Midnight";
  description: string;
  badge: string;
  url: string;
  attribution: string;
  subdomains?: string;
}

export const BASEMAP_OPTIONS: BasemapOption[] = [
  {
    id: "street",
    name: "Clean Street",
    category: "Clean GIS",
    description: "Crisp roads, landmarks & clean town boundaries",
    badge: "Recommended",
    url: ESRI_WORLD_STREET_URL,
    attribution: ESRI_ATTRIBUTION,
  },
  {
    id: "minimal",
    name: "Minimal Canvas",
    category: "Aesthetic",
    description: "Soft pastel canvas for pristine pin visualization",
    badge: "Clean",
    url: ESRI_LIGHT_GRAY_URL,
    attribution: ESRI_ATTRIBUTION,
  },
  {
    id: "natgeo",
    name: "National Geographic",
    category: "Aesthetic",
    description: "Artistic storybook terrain, clean typography & warm boundaries",
    badge: "Cute 🎨",
    url: ESRI_NATGEO_URL,
    attribution: NATGEO_ATTRIBUTION,
  },
  {
    id: "topo",
    name: "Topographic",
    category: "Aesthetic",
    description: "Natural terrain contours, shaded relief & water bodies",
    badge: "Nature",
    url: ESRI_WORLD_TOPO_URL,
    attribution: ESRI_ATTRIBUTION,
  },
  {
    id: "satellite",
    name: "Satellite Imagery",
    category: "Satellite",
    description: "High-resolution orbital satellite photography",
    badge: "Aerial",
    url: ESRI_WORLD_IMAGERY_URL,
    attribution: ESRI_IMAGERY_ATTRIBUTION,
  },
  {
    id: "dark",
    name: "Midnight Dark",
    category: "Midnight",
    description: "Sleek slate dark mode with high contrast pin glow",
    badge: "Dark",
    url: ESRI_DARK_GRAY_URL,
    attribution: ESRI_ATTRIBUTION,
  },
  {
    id: "osm",
    name: "OpenStreetMap",
    category: "Clean GIS",
    description: "Community cartography with standard street markings",
    badge: "Standard",
    url: OSM_TILE_URL,
    attribution: OSM_ATTRIBUTION,
  },
];

export interface MapDisplaySettings {
  basemapStyle?: BasemapStyle;
  minimalistMode: boolean;
  mapTheme: "light" | "dark";
  basemapPlaceNames: boolean;
  barangayLabels: boolean;
  cityLabels: boolean;
  schoolLabels: boolean;
  schoolNameLabels: boolean;
  roads: boolean;
  clusters: boolean;
  overlays: boolean;
  programLegend: boolean;
  municipalityLabels?: boolean;
}

export const DEFAULT_MAP_DISPLAY_SETTINGS: MapDisplaySettings = {
  basemapStyle: "street",
  minimalistMode: false,
  mapTheme: "light",
  basemapPlaceNames: true,
  barangayLabels: false,
  cityLabels: false,
  // schoolLabels defaults to false so huge 240px tooltips don't clutter and overlap the map permanently!
  // Tooltips cleanly appear on hover or click, or when explicitly toggled on by user.
  schoolLabels: false,
  schoolNameLabels: true,
  roads: true,
  clusters: true,
  overlays: true,
  programLegend: true,
};

export function normalizeMapDisplaySettings(raw?: Partial<MapDisplaySettings>): MapDisplaySettings {
  if (!raw) return DEFAULT_MAP_DISPLAY_SETTINGS;
  const legacyMuni = raw.municipalityLabels === true;
  return {
    ...DEFAULT_MAP_DISPLAY_SETTINGS,
    ...raw,
    // Hover tooltips should always default to false to prevent card overlapping
    schoolLabels: false,
    basemapStyle: raw.basemapStyle ?? (raw.mapTheme === "dark" ? "dark" : (raw.minimalistMode ? "minimal" : "street")),
    barangayLabels: raw.barangayLabels ?? legacyMuni,
    cityLabels: raw.cityLabels ?? legacyMuni,
    basemapPlaceNames: raw.basemapPlaceNames ?? DEFAULT_MAP_DISPLAY_SETTINGS.basemapPlaceNames,
    mapTheme: raw.mapTheme ?? (raw.basemapStyle === "dark" ? "dark" : DEFAULT_MAP_DISPLAY_SETTINGS.mapTheme),
    clusters: raw.clusters ?? true,
    programLegend: raw.programLegend ?? DEFAULT_MAP_DISPLAY_SETTINGS.programLegend,
  };
}

export function resolveBasemapTileUrl(settings: MapDisplaySettings): { url: string; attribution: string; subdomains?: string } {
  // If user selected dark mapTheme, default to dark
  if (settings.mapTheme === "dark" || settings.basemapStyle === "dark") {
    return {
      url: ESRI_DARK_GRAY_URL,
      attribution: ESRI_ATTRIBUTION,
    };
  }

  if (settings.basemapStyle) {
    const found = BASEMAP_OPTIONS.find((b) => b.id === settings.basemapStyle);
    if (found) {
      return {
        url: found.url,
        attribution: found.attribution,
        subdomains: found.subdomains,
      };
    }
  }

  // Use clean minimal light gray canvas when minimalistMode is enabled or roads are off
  if (settings.minimalistMode || !settings.roads) {
    return {
      url: ESRI_LIGHT_GRAY_URL,
      attribution: ESRI_ATTRIBUTION,
    };
  }

  // Crisp, clean World Street Map: clean roads, town names, and clear geography with no watermarks
  return {
    url: ESRI_WORLD_STREET_URL,
    attribution: ESRI_ATTRIBUTION,
  };
}

export interface AnalyticsVisibility {
  densityLegend: boolean;
  schoolStats: boolean;
  municipalitySummary: boolean;
  enrollmentOverlay: boolean;
  heatmap: boolean;
  charts: boolean;
  summaryBadge: boolean;
  summaryFeederCount: boolean;
  summaryEnrollmentTotal: boolean;
  floatingPanels: boolean;
}

export interface DrawDisplaySettings {
  showDrawings: boolean;
  lockDrawingMode: boolean;
  annotationVisibility: boolean;
}
