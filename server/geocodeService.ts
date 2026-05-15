import { normalizeSchoolName } from "@shared/schoolRegistry";

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  source: "Nominatim" | "cache";
}

const memoryCache = new Map<string, GeocodeResult | null>();
let lastNominatimCall = 0;
const MIN_INTERVAL_MS = 1100;
let queue: Promise<void> = Promise.resolve();

function cacheKey(name: string, municipality: string) {
  return normalizeSchoolName(`${name} ${municipality || "Laguna"}`);
}

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

async function waitForRateLimit() {
  const elapsed = Date.now() - lastNominatimCall;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastNominatimCall = Date.now();
}

async function queryNominatim(name: string, municipality: string): Promise<GeocodeResult | null> {
  const queries = [
    `${name}, ${municipality}, Laguna, Philippines`,
    `${name}, Laguna, Philippines`,
  ];

  for (const query of queries) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "ph");
    url.searchParams.set("q", query);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "StudentMappingSystem/1.0 (feeder-school-geocoding)",
        Accept: "application/json",
      },
    });

    if (!response.ok) continue;
    const [match] = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const lat = Number(match?.lat);
    const lng = Number(match?.lon);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        lat,
        lng,
        displayName: match.display_name || query,
        source: "Nominatim",
      };
    }
  }

  return null;
}

/** Debounced, cached Nominatim lookup — schools table remains the permanent cache. */
export function geocodeSchoolWithNominatim(name: string, municipality = "Laguna"): Promise<GeocodeResult | null> {
  const key = cacheKey(name, municipality);
  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key);
    if (cached) return Promise.resolve({ ...cached, source: "cache" });
    return Promise.resolve(null);
  }

  return schedule(async () => {
    await waitForRateLimit();
    const result = await queryNominatim(name.trim(), municipality.trim() || "Laguna");
    memoryCache.set(key, result);
    return result;
  });
}

export function primeGeocodeCache(name: string, municipality: string, lat: number, lng: number, displayName?: string) {
  memoryCache.set(cacheKey(name, municipality), {
    lat,
    lng,
    displayName: displayName || name,
    source: "cache",
  });
}
