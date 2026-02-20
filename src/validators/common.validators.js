import { z } from "zod";

export const objectIdSchema = z
    .string()
    .trim()
    .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const pageSchema = z.coerce.number().int().min(1).default(1);
export const limitSchema = z.coerce.number().int().min(1).max(100).default(10);

export const bookingStatusSchema = z.enum([
    "pending",
    "confirmed",
    "in-progress",
    "completed",
    "cancelled",
]);
