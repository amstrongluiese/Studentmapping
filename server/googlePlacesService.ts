export interface GooglePlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface GooglePlaceDetails {
  placeId: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  municipality: string;
  province: string;
  types: string[];
}

const LAGUNA_CENTER = { lat: 14.1667, lng: 121.25 };
const LAGUNA_RADIUS_METERS = 95000;
let warnedMissingGoogleKey = false;

function googleMapsApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key && !warnedMissingGoogleKey) {
    warnedMissingGoogleKey = true;
    console.warn(
      "[googlePlaces] GOOGLE_MAPS_API_KEY is not set. Google Places suggestions are disabled.",
    );
  }
  return key;
}

function getComponent(
  components: Array<{ long_name?: string; short_name?: string; types?: string[] }> = [],
  type: string,
) {
  return components.find((component) => component.types?.includes(type))?.long_name?.trim();
}

const EDUCATION_KEYWORDS = /\b(school|high school|secondary school|elementary|college|university|academy|institute|training center|learning center|campus)\b/;

function scorePrediction(prediction: GooglePlaceSuggestion) {
  const text = `${prediction.mainText} ${prediction.secondaryText} ${prediction.description}`.toLowerCase();
  let score = 0;

  if (prediction.types.includes("school") || prediction.types.includes("university") || prediction.types.includes("college")) {
    score += 12;
  }
  if (prediction.types.includes("establishment")) {
    score += 4;
  }
  if (EDUCATION_KEYWORDS.test(text)) {
    score += 10;
  }
  if (text.includes("laguna")) score += 6;
  if (text.includes("calabarzon") || text.includes("region iv")) score += 3;
  if (text.includes("philippines")) score += 1;
  if (text.includes("hotel") || text.includes("resort") || text.includes("restaurant") || text.includes("mall")) score -= 6;

  return score;
}

export async function suggestGoogleSchools(query: string, limit = 5): Promise<GooglePlaceSuggestion[]> {
  const input = query.trim();
  const apiKey = googleMapsApiKey();
  if (!apiKey || input.length < 2) return [];

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("components", "country:ph");
  url.searchParams.set("types", "establishment");
  url.searchParams.set("location", `${LAGUNA_CENTER.lat},${LAGUNA_CENTER.lng}`);
  url.searchParams.set("radius", String(LAGUNA_RADIUS_METERS));
  url.searchParams.set("language", "en");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    status?: string;
    predictions?: Array<{
      place_id?: string;
      description?: string;
      types?: string[];
      structured_formatting?: {
        main_text?: string;
        secondary_text?: string;
      };
    }>;
  };

  if (!["OK", "ZERO_RESULTS"].includes(payload.status || "")) return [];

  return (payload.predictions || [])
    .filter((prediction) => prediction.place_id && prediction.description)
    .map((prediction) => ({
      placeId: prediction.place_id!,
      description: prediction.description!,
      mainText: prediction.structured_formatting?.main_text || prediction.description!,
      secondaryText: prediction.structured_formatting?.secondary_text || "",
      types: prediction.types || [],
    }))
    .sort((a, b) => scorePrediction(b) - scorePrediction(a))
    .slice(0, limit);
}

export async function getGooglePlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const apiKey = googleMapsApiKey();
  const id = placeId.trim();
  if (!apiKey || !id) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", id);
  url.searchParams.set("fields", "place_id,name,formatted_address,geometry,address_components,types");
  url.searchParams.set("language", "en");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    status?: string;
    result?: {
      place_id?: string;
      name?: string;
      formatted_address?: string;
      types?: string[];
      geometry?: { location?: { lat?: number; lng?: number } };
      address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>;
    };
  };

  if (payload.status !== "OK" || !payload.result) return null;

  const lat = payload.result.geometry?.location?.lat;
  const lng = payload.result.geometry?.location?.lng;
  const name = payload.result.name?.trim();
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const components = payload.result.address_components || [];
  const municipality =
    getComponent(components, "locality") ||
    getComponent(components, "administrative_area_level_3") ||
    getComponent(components, "administrative_area_level_2") ||
    "Laguna";
  const province =
    getComponent(components, "administrative_area_level_2") ||
    getComponent(components, "administrative_area_level_1") ||
    "Laguna";

  return {
    placeId: payload.result.place_id || id,
    name,
    displayName: payload.result.formatted_address || name,
    lat: lat!,
    lng: lng!,
    municipality,
    province,
    types: payload.result.types || [],
  };
}
