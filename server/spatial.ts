import { sql } from "drizzle-orm";
import { getDb } from "./db";

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

/**
  Calculate spatial distance in kilometers between two geographic coordinates
  using the Haversine formula (or PostGIS ST_DistanceSphere if available).
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
  Executes a spatial radius query using SQL / PostGIS syntax.
  Returns school IDs within radiusKm of the target coordinate.
 */
export async function findSchoolsWithinRadius(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<number[]> {
  const db = getDb();
  try {
    const result = await db.execute(sql`
      SELECT id, 
             (6371 * acos(
               cos(radians(${latitude})) * cos(radians(latitude)) * 
               cos(radians(longitude) - radians(${longitude})) + 
               sin(radians(${latitude})) * sin(radians(latitude))
             )) AS distance_km
      FROM school_registry
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      HAVING (6371 * acos(
               cos(radians(${latitude})) * cos(radians(latitude)) * 
               cos(radians(longitude) - radians(${longitude})) + 
               sin(radians(${latitude})) * sin(radians(latitude))
             )) <= ${radiusKm}
      ORDER BY distance_km ASC;
    `);

    return (result[0] as unknown as any[]).map((r) => Number(r.id));
  } catch (err) {
    console.error("[spatial] Radius search query error:", err);
    return [];
  }
}
