import { z } from 'zod';
import { insertSchoolSchema, schools, insertReferralSchema, referrals, students, insertStudentSchema } from './schema';

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

export type StudentInput = z.infer<typeof api.students.register.input>;
export type StudentResponse = z.infer<typeof api.students.register.responses[201]>;

export type ReferralInput = z.infer<typeof api.referrals.create.input>;
export type ReferralResponse = z.infer<typeof api.referrals.create.responses[201]>;
