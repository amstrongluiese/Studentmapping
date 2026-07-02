import { api, type GeocodeSchoolResponse } from "@shared/routes";

export interface GeocodeSchoolRequest {
  schoolName: string;
  municipality?: string | null;
}

function readErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return fallback;
}

/** Build a clean JSON body — omits empty municipality so the API can do name-only lookup. */
export function buildGeocodeRequestBody(input: GeocodeSchoolRequest): { schoolName: string; municipality?: string } {
  const schoolName = input.schoolName?.trim() ?? "";
  if (schoolName.length < 2) {
    throw new Error("School name is required");
  }

  const municipality = input.municipality?.trim();
  const body: { schoolName: string; municipality?: string } = { schoolName };
  if (municipality) body.municipality = municipality;
  return body;
}

/**
 * Server-side matching proxy using local database and JSON Master Directory.
 * Returns null on 404 (no match) instead of throwing.
 */
export async function requestGeocodeSchool(
  input: GeocodeSchoolRequest,
): Promise<GeocodeSchoolResponse | null> {
  const body = buildGeocodeRequestBody(input);

  const response = await fetch(api.geocode.school.path, {
    method: api.geocode.school.method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = readErrorMessage(payload, "Unable to geolocate school.");
    console.warn("[geocode]", response.status, message, { body });
    if (response.status === 404) return null;
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && (payload as { success?: boolean }).success === false) {
    const message = readErrorMessage(payload, "Unable to geolocate school.");
    console.warn("[geocode] rejected:", message, { body });
    throw new Error(message);
  }

  return api.geocode.school.responses[200].parse(payload);
}

/** Same as requestGeocodeSchool but always throws on failure (manual geolocate flows). */
export async function requestGeocodeSchoolOrThrow(
  input: GeocodeSchoolRequest,
): Promise<GeocodeSchoolResponse> {
  const result = await requestGeocodeSchool(input);
  if (!result) {
    throw new Error("No coordinates found for this school.");
  }
  return result;
}
