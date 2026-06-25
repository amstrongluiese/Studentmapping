import { api } from "@shared/routes";

export async function resolveGooglePlaceSchool(placeId: string, alias?: string) {
  const input = api.geocode.resolvePlace.input.parse({ placeId, alias });
  const response = await fetch(api.geocode.resolvePlace.path, {
    method: api.geocode.resolvePlace.method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messageValue =
      payload && typeof payload === "object" && "message" in payload
        ? (payload as { message?: unknown }).message
        : undefined;
    const message =
      typeof messageValue === "string"
        ? messageValue
        : "Unable to verify Google Places school.";
    throw new Error(message);
  }

  return api.geocode.resolvePlace.responses[200].parse(payload);
}
