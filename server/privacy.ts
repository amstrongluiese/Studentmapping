import { getDb } from "./db";
import { studentsProcessed, studentsRaw, studentImports } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logAuditEvent } from "./auditLogger";

/**
  Masks personal identifiable information (PII) for compliance output.
 */
export function maskStudentName(name: string): string {
  if (!name) return "";
  const parts = name.split(" ");
  return parts
    .map((p) => (p.length > 2 ? `${p[0]}***${p[p.length - 1]}` : `${p[0]}*`))
    .join(" ");
}

export function maskContactNumber(phone?: string | null): string {
  if (!phone || phone.length < 7) return "****";
  return phone.substring(0, 4) + "****" + phone.substring(phone.length - 2);
}

/**
  Data Subject Request (DSR) - Anonymize Student Record (Right to Erasure under RA 10173 Section 16).
 */
export async function anonymizeStudentRecord(studentNumber: string, actor: string = "Admin") {
  const db = getDb();
  
  await db
    .update(studentsProcessed)
    .set({
      fullName: "ANONYMIZED_STUDENT",
      contactNumber: "0000000000",
      requirements: null,
    })
    .where(eq(studentsProcessed.studentNumber, studentNumber));

  await db
    .update(studentsRaw)
    .set({
      fullName: "ANONYMIZED_STUDENT",
      contactNumber: "0000000000",
      rawPayload: null,
    })
    .where(eq(studentsRaw.studentNumber, studentNumber));

  await logAuditEvent({
    actor,
    action: "UPDATE",
    targetResource: `student_number:${studentNumber}`,
    details: "Executed Data Subject Right to Erasure / Anonymization under RA 10173 Section 16",
  });

  return { success: true, message: `Student ${studentNumber} has been anonymized.` };
}
