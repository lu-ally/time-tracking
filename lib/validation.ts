import { z } from "zod"

export const emailSchema = z.string().email()

export const passwordSchema = z
  .string()
  .min(8, "Mindestens 8 Zeichen")
  .regex(/[A-Z]/, "Mindestens ein Grossbuchstabe")
  .regex(/[a-z]/, "Mindestens ein Kleinbuchstabe")
  .regex(/[0-9]/, "Mindestens eine Zahl")
  .regex(/[^A-Za-z0-9]/, "Mindestens ein Sonderzeichen")

export const timeEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  breakMinutes: z.number().int().min(0),
  note: z.string().max(500).optional().default("")
})

export const leaveEntrySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  halfDayStart: z.boolean().optional().default(false),
  halfDayEnd: z.boolean().optional().default(false),
  note: z.string().max(500).optional().default(""),
  privateNote: z.string().max(500).optional().default("")
})
