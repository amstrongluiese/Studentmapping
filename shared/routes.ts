import { z } from 'zod';
import {
  insertSchoolSchema,
  schools,
  insertReferralSchema,
  referrals,
  students,
  insertStudentSchema,
  studentsProcessed,
  imports,
} from './schema';

const schoolImportSchema = z.object({
  schools: z.array(insertSchoolSchema).min(1),
});

const schoolImportResponseSchema = z.object({
  created: z.number(),
  updated: z.number(),
  skipped: z.number(),
  schools: z.array(z.custom<typeof schools.$inferSelect>()),
  issues: z.array(z.string()),
});

const integrationPreviewInputSchema = z.object({
  sourceType: z.enum(["api", "googleSheets"]),
  url: z.string().url(),
  method: z.enum(["GET", "POST"]).default("GET"),
  authMode: z.enum(["none", "bearer", "apiKey"]).default("none"),
  authToken: z.string().optional(),
  apiKeyHeader: z.string().optional(),
  body: z.string().optional(),
});

const integrationPreviewResponseSchema = z.object({
  status: z.number(),
  sourceType: z.enum(["api", "googleSheets"]),
  contentType: z.string(),
  fields: z.array(z.string()),
  records: z.array(z.record(z.unknown())),
  rawPreview: z.unknown().optional(),
  sourceLabel: z.string(),
});

const geocodeSchoolInputSchema = z.object({
  name: z
    .string({ required_error: "School name is required" })
    .trim()
    .min(2, "School name is required"),
  municipality: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }),
});

const geocodeSchoolFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

const geocodeSchoolResponseSchema = z.object({
  success: z.literal(true).optional(),
  lat: z.number(),
  lng: z.number(),
  displayName: z.string(),
  source: z.enum(["Google Maps", "Nominatim", "cache", "registry", "alias"]),
  schoolId: z.number().optional(),
  reused: z.boolean().optional(),
});

const googlePlaceSuggestionSchema = z.object({
  placeId: z.string(),
  description: z.string(),
  mainText: z.string(),
  secondaryText: z.string(),
  types: z.array(z.string()),
});

const resolveGooglePlaceInputSchema = z.object({
  placeId: z.string().trim().min(1, "Google place_id is required"),
  alias: z.string().trim().optional(),
});

const resolveGooglePlaceResponseSchema = z.object({
  school: z.custom<typeof schools.$inferSelect>(),
  created: z.boolean(),
  reused: z.boolean(),
  displayName: z.string(),
});

const studentSyncRecordSchema = z.object({
  studentNumber: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
  course: z.string().trim().optional().nullable(),
  lastSchoolName: z.string().trim().min(1),
  lastSchoolType: z.string().trim().optional().nullable(),
  studentType: z.string().trim().optional().nullable(),
  municipality: z.string().trim().optional().nullable(),
  province: z.string().trim().optional().nullable(),
  yearLevel: z.string().trim().optional().nullable(),
  enrollmentStatus: z.string().trim().optional().nullable(),
  enrollmentDate: z.string().trim().optional().nullable(),
  rawPayload: z.record(z.unknown()).optional(),
});

const studentSyncInputSchema = z.object({
  source: z.string().trim().min(1).default("api"),
  records: z.array(studentSyncRecordSchema).min(1),
});

const studentSyncResponseSchema = z.object({
  importId: z.number(),
  processed: z.number(),
  skipped: z.number(),
  failed: z.number(),
  schoolsCreated: z.number(),
  schoolsGeocoded: z.number(),
});

const mappingQueueItemSchema = z.object({
  kind: z.enum(["school", "student"]),
  id: z.number(),
  title: z.string(),
  subtitle: z.string(),
  issues: z.array(z.string()),
  schoolId: z.number().optional(),
});

const batchDeleteInputSchema = z.object({
  ids: z.array(z.number()).min(1, "Please select at least one record to delete"),
});

const studentManagementStatusSchema = z.enum([
  "Active",
  "Enrolled",
  "Pending",
  "Dropped",
  "Transferred",
  "Graduated",
  "Archived",
]);

const studentManagementUpdateSchema = z.object({
  studentNumber: z.string().trim().min(1).optional(),
  fullName: z.string().trim().min(1).optional(),
  course: z.string().trim().nullable().optional(),
  lastSchoolName: z.string().trim().min(1).optional(),
  lastSchoolType: z.string().trim().nullable().optional(),
  municipality: z.string().trim().min(1).optional(),
  province: z.string().trim().min(1).optional(),
  yearLevel: z.string().trim().nullable().optional(),
  enrollmentStatus: studentManagementStatusSchema.optional(),
  enrollmentDate: z.string().trim().nullable().optional(),
});

const batchStudentStatusInputSchema = z.object({
  ids: z.array(z.number()).min(1, "Please select at least one student"),
  enrollmentStatus: studentManagementStatusSchema,
});

const batchDeleteResponseSchema = z.object({
  success: z.boolean(),
  deletedCount: z.number(),
  skippedCount: z.number(),
  message: z.string(),
});

const verifyMappingInputSchema = z.object({
  schoolId: z.number(),
  verified: z.boolean().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  name: z.string().trim().optional(),
  municipality: z.string().trim().optional(),
  createAlias: z.string().trim().optional(),
});

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  schools: {
    list: {
      method: 'GET' as const,
      path: '/api/schools' as const,
      responses: {
        200: z.array(z.custom<typeof schools.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/schools/:id' as const,
      responses: {
        200: z.custom<typeof schools.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/schools' as const,
      input: insertSchoolSchema,
      responses: {
        201: z.custom<typeof schools.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    import: {
      method: 'POST' as const,
      path: '/api/schools/import' as const,
      input: schoolImportSchema,
      responses: {
        200: schoolImportResponseSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/schools/:id' as const,
      input: insertSchoolSchema.partial(),
      responses: {
        200: z.custom<typeof schools.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/schools/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    batchDelete: {
      method: 'POST' as const,
      path: '/api/schools/batch-delete' as const,
      input: batchDeleteInputSchema,
      responses: {
        200: batchDeleteResponseSchema,
        400: errorSchemas.validation,
      },
    },
  },
  integrations: {
    preview: {
      method: 'POST' as const,
      path: '/api/integrations/preview' as const,
      input: integrationPreviewInputSchema,
      responses: {
        200: integrationPreviewResponseSchema,
        400: errorSchemas.validation,
      },
    },
  },
  geocode: {
    school: {
      method: 'POST' as const,
      path: '/api/geocode/school' as const,
      input: geocodeSchoolInputSchema,
      responses: {
        200: geocodeSchoolResponseSchema,
        400: geocodeSchoolFailureSchema,
        404: geocodeSchoolFailureSchema,
      },
    },
    suggest: {
      method: 'GET' as const,
      path: '/api/geocode/suggest' as const,
      responses: {
        200: z.object({
          registry: z.array(z.custom<typeof schools.$inferSelect>()),
          places: z.array(googlePlaceSuggestionSchema),
          nominatim: z.array(
            z.object({
              name: z.string(),
              displayName: z.string(),
              lat: z.number(),
              lng: z.number(),
            }),
          ),
        }),
      },
    },
    resolvePlace: {
      method: 'POST' as const,
      path: '/api/geocode/resolve-place' as const,
      input: resolveGooglePlaceInputSchema,
      responses: {
        200: resolveGooglePlaceResponseSchema,
        400: geocodeSchoolFailureSchema,
        404: geocodeSchoolFailureSchema,
      },
    },
  },
  mapping: {
    queue: {
      method: 'GET' as const,
      path: '/api/mapping/queue' as const,
      responses: {
        200: z.array(mappingQueueItemSchema),
      },
    },
    verify: {
      method: 'POST' as const,
      path: '/api/mapping/verify' as const,
      input: verifyMappingInputSchema,
      responses: {
        200: z.custom<typeof schools.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  gis: {
    studentsSync: {
      method: 'POST' as const,
      path: '/api/students/sync' as const,
      input: studentSyncInputSchema,
      responses: {
        200: studentSyncResponseSchema,
        400: errorSchemas.validation,
      },
    },
    processedStudents: {
      method: 'GET' as const,
      path: '/api/students/processed' as const,
      responses: {
        200: z.array(z.custom<typeof studentsProcessed.$inferSelect>()),
      },
    },
    batchDeleteStudents: {
      method: 'POST' as const,
      path: '/api/students/processed/batch-delete' as const,
      input: batchDeleteInputSchema,
      responses: {
        200: batchDeleteResponseSchema,
        400: errorSchemas.validation,
      },
    },
    updateProcessedStudent: {
      method: 'PATCH' as const,
      path: '/api/students/processed/:id' as const,
      input: studentManagementUpdateSchema,
      responses: {
        200: z.custom<typeof studentsProcessed.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    batchUpdateStudentStatus: {
      method: 'POST' as const,
      path: '/api/students/processed/batch-status' as const,
      input: batchStudentStatusInputSchema,
      responses: {
        200: batchDeleteResponseSchema,
        400: errorSchemas.validation,
      },
    },
    overview: {
      method: 'GET' as const,
      path: '/api/gis/overview' as const,
      responses: {
        200: z.object({
          totalStudentsSynced: z.number(),
          freshmenCount: z.number(),
          transfereeCount: z.number(),
          verifiedSchools: z.number(),
          unmappedSchools: z.number(),
        }),
      },
    },
    importLogs: {
      method: 'GET' as const,
      path: '/api/imports/logs' as const,
      responses: {
        200: z.array(z.custom<typeof imports.$inferSelect>()),
      },
    },
    batchDeleteImports: {
      method: 'POST' as const,
      path: '/api/imports/batch-delete' as const,
      input: batchDeleteInputSchema,
      responses: {
        200: batchDeleteResponseSchema,
        400: errorSchemas.validation,
      },
    },
  },
  schoolsSearch: {
    search: {
      method: 'GET' as const,
      path: '/api/schools/search' as const,
      responses: {
        200: z.array(z.custom<typeof schools.$inferSelect>()),
      },
    },
  },
  students: {
    list: {
      method: 'GET' as const,
      path: '/api/students' as const,
      responses: {
        200: z.array(z.custom<typeof students.$inferSelect>()),
      },
    },
    getByNumber: {
      method: 'GET' as const,
      path: '/api/students/:studentNumber' as const,
      responses: {
        200: z.custom<typeof students.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    getByCode: {
      method: 'GET' as const,
      path: '/api/students/code/:referralCode' as const,
      responses: {
        200: z.custom<typeof students.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/students/register' as const,
      input: insertStudentSchema,
      responses: {
        201: z.custom<typeof students.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  referrals: {
    list: {
      method: 'GET' as const,
      path: '/api/referrals' as const,
      responses: {
        200: z.array(z.custom<typeof referrals.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/referrals' as const,
      input: insertReferralSchema,
      responses: {
        201: z.custom<typeof referrals.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/referrals/:id' as const,
      input: insertReferralSchema.partial(),
      responses: {
        200: z.custom<typeof referrals.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/referrals/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type SchoolInput = z.infer<typeof api.schools.create.input>;
export type SchoolResponse = z.infer<typeof api.schools.create.responses[201]>;

export type IntegrationPreviewInput = z.infer<typeof api.integrations.preview.input>;
export type IntegrationPreviewResponse = z.infer<typeof api.integrations.preview.responses[200]>;

export type GeocodeSchoolInput = z.infer<typeof api.geocode.school.input>;
export type GeocodeSchoolResponse = z.infer<typeof api.geocode.school.responses[200]>;

export type StudentInput = z.infer<typeof api.students.register.input>;
export type StudentResponse = z.infer<typeof api.students.register.responses[201]>;

export type ReferralInput = z.infer<typeof api.referrals.create.input>;
export type ReferralResponse = z.infer<typeof api.referrals.create.responses[201]>;
