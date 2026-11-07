import { getDb } from "./db";
import { auditLogs } from "@shared/schema";
import type { Request } from "express";

export type AuditAction = 
  | "CREATE"
  | "READ_PII"
  | "UPDATE"
  | "DELETE"
  | "CLEAR_ALL_DATA"
  | "IMPORT_DIRECTORY"
  | "IMPORT_STUDENTS"
  | "EXPORT_DATA"
  | "EXPORT_DSR";

export interface LogAuditOptions {
  actor?: string;
  role?: string;
  action: AuditAction;
  targetResource: string;
  details?: string;
  ipAddress?: string;
  status?: "SUCCESS" | "FAILED";
}

/**
  Data Privacy Act (RA 10173) Audit Log Service.
  Persists immutable security events to the audit_logs table.
 */
export async function logAuditEvent(options: LogAuditOptions, req?: Request) {
  try {
    const db = getDb();
    const actor = options.actor || req?.user?.username || "System";
    const role = options.role || req?.user?.role || "System";
    const ipAddress = options.ipAddress || req?.ip || req?.socket.remoteAddress || "127.0.0.1";

    await db.insert(auditLogs).values({
      actor,
      role,
      action: options.action,
      targetResource: options.targetResource,
      details: options.details || null,
      ipAddress,
      status: options.status || "SUCCESS",
    });

    console.log(`[Audit] [${options.action}] by ${actor} (${role}) -> ${options.targetResource}`);
  } catch (err) {
    console.error("[AuditLogger] Failed to write audit log:", err);
  }
}
