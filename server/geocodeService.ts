import { normalizeSchoolName } from "@shared/schoolRegistry";

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  source: "Google Maps" | "Nominatim" | "cache";
}

const memoryCache = new Map<string, GeocodeResult | null>();
let warnedMissingGeocodeKey = false;
let lastNominatimCall = 0;
const MIN_INTERVAL_MS = 1100;
let queue: Promise<void> = Promise.resolve();

function cacheKey(name: string, municipality?: string) {
  const normalized = normalizeSchoolName(name);
  const muni = municipality?.trim();
  return muni ? `${normalized}|${normalizeSchoolName(muni)}` : normalized;
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

/** Ordered Nominatim queries: name+municipality → name+Laguna → name-only (Philippines). */
export function buildNominatimQueries(name: string, municipality?: string): string[] {
  const schoolName = name.trim();
  if (!schoolName) return [];

  const muni = municipality?.trim();
  const queries: string[] = [];

  if (muni) {
    queries.push(`${schoolName}, ${muni}, Laguna, Philippines`);
    queries.push(`${schoolName}, ${muni}, Philippines`);
  }

  queries.push(`${schoolName}, Laguna, Philippines`);
  queries.push(`${schoolName}, Philippines`);
  queries.push(schoolName);

  return Array.from(new Set(queries));
}

async function queryNominatim(name: string, municipality?: string): Promise<GeocodeResult | null> {
  const queries = buildNominatimQueries(name, municipality);

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

const LAGUNA_BOUNDS = {
  southwest: { lat: 13.847, lng: 120.865 },
  northeast: { lat: 14.557, lng: 121.53 },
};

async function queryGoogleMaps(name: string, municipality?: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    if (!warnedMissingGeocodeKey) {
      warnedMissingGeocodeKey = true;
      console.warn(
        "[geocode] GOOGLE_MAPS_API_KEY is not set. Google Geocoding fallback will use Nominatim only.",
      );
    }
    return null;
  }

  const queries = buildNominatimQueries(name, municipality);
  for (const query of queries) {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("components", "country:PH");
    url.searchParams.set(
      "bounds",
      `${LAGUNA_BOUNDS.southwest.lat},${LAGUNA_BOUNDS.southwest.lng}|${LAGUNA_BOUNDS.northeast.lat},${LAGUNA_BOUNDS.northeast.lng}`,
    );
    url.searchParams.set("region", "ph");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) continue;

    const payload = (await response.json()) as {
      status?: string;
      results?: Array<{
        formatted_address?: string;
        geometry?: {
          location?: {
            lat?: number;
            lng?: number;
          };
        };
      }>;
    };

    if (payload.status !== "OK") continue;
    const match = payload.results?.[0];
    if (!match) continue;
    const lat = match.geometry?.location?.lat;
    const lng = match.geometry?.location?.lng;

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        lat: lat!,
        lng: lng!,
        displayName: match.formatted_address || query,
        source: "Google Maps",
      };
    }
  }

  return null;
}

/** Debounced, cached geocode lookup; schools table remains the permanent cache. */
export function geocodeSchoolWithNominatim(
  name: string,
  municipality?: string,
): Promise<GeocodeResult | null> {
  const trimmedName = name.trim();
  if (trimmedName.length < 2) return Promise.resolve(null);

  const key = cacheKey(trimmedName, municipality);
  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key);
    if (cached) return Promise.resolve({ ...cached, source: "cache" });
    return Promise.resolve(null);
  }

  return schedule(async () => {
    await waitForRateLimit();
    const result = await queryGoogleMaps(trimmedName, municipality) ?? await queryNominatim(trimmedName, municipality);
    memoryCache.set(key, result);
    return result;
  });
}

export function primeGeocodeCache(
  name: string,
  municipality: string | undefined,
  lat: number,
  lng: number,
  displayName?: string,
) {
  memoryCache.set(cacheKey(name, municipality), {
    lat,
    lng,
    displayName: displayName || name,
    source: "cache",
  });
}
