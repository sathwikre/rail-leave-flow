import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const employeeCreateSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  phone: z.string().trim().default(""),
  department: z.string().trim().min(1),
  joiningDate: dateString,
  leaveUsedThisMonth: z.coerce.number().int().min(0).default(0),
  avatar: z.string().url().optional(),
  active: z.boolean().default(true),
});

export const employeeUpdateSchema = employeeCreateSchema.partial().omit({ id: true });

export const leaveRequestCreateSchema = z.object({
  employeeId: z.string().trim().min(1),
  fromDate: dateString,
  toDate: dateString,
  days: z.coerce.number().int().min(1).optional(),
  reason: z.string().trim().min(1),
  requestDate: dateString.optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

export const leaveRequestUpdateSchema = leaveRequestCreateSchema.partial();

export const leaveStatusSchema = z.object({
  status: z.enum(["approved", "rejected", "pending"]),
});

export const attendanceUpsertSchema = z.object({
  employeeId: z.string().trim().min(1),
  date: dateString,
  status: z.enum(["present", "leave", "off"]),
  note: z.string().trim().optional(),
});

export const settingsUpdateSchema = z.object({
  monthlyLeaveLimit: z.coerce.number().int().min(1).max(31).optional(),
  autoApproveWithinLimit: z.boolean().optional(),
  showRecommendations: z.boolean().optional(),
  notifications: z
    .object({
      whatsapp: z.boolean().optional(),
      emailDigest: z.boolean().optional(),
      sms: z.boolean().optional(),
      weeklyReport: z.boolean().optional(),
    })
    .optional(),
});

export const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().trim().min(1),
  text: z.string().trim().min(1),
});
