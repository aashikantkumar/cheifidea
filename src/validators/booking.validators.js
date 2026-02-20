import { z } from "zod";
import { objectIdSchema } from "./common.validators.js";

export const createBookingValidator = z.object({
    body: z.object({
        chefId: objectIdSchema,
        dishes: z
            .array(
                z.object({
                    dishId: objectIdSchema,
                    quantity: z.coerce.number().int().min(1).default(1),
                })
            )
            .min(1),
        bookingDate: z.string().trim().min(1),
        bookingTime: z.string().trim().min(1),
        eventType: z.string().trim().max(80).optional(),
        guestCount: z.coerce.number().int().min(1),
        serviceLocation: z.object({
            address: z.string().trim().min(1).max(255),
            city: z.string().trim().max(100).optional(),
            state: z.string().trim().max(100).optional(),
            zipCode: z.string().trim().max(20).optional(),
            coordinates: z
                .object({
                    latitude: z.coerce.number().optional(),
                    longitude: z.coerce.number().optional(),
                })
                .optional(),
        }),
        specialInstructions: z.string().trim().max(500).optional(),
        dietaryRestrictions: z.array(z.string().trim().max(120)).optional(),
        paymentMethod: z.enum(["cash", "card", "upi", "wallet"]).optional(),
    }),
    params: z.object({}),
    query: z.object({}),
});

export const bookingIdParamValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({ bookingId: objectIdSchema }),
    query: z.object({}),
});

export const cancelBookingValidator = z.object({
    body: z.object({
        reason: z.string().trim().max(300).optional(),
    }),
    params: z.object({ bookingId: objectIdSchema }),
    query: z.object({}),
});

export const addReviewValidator = z.object({
    body: z.object({
        rating: z.coerce.number().min(1).max(5),
        foodQuality: z.coerce.number().min(1).max(5).optional(),
        professionalism: z.coerce.number().min(1).max(5).optional(),
        punctuality: z.coerce.number().min(1).max(5).optional(),
        comment: z.string().trim().max(1000).optional(),
    }),
    params: z.object({ bookingId: objectIdSchema }),
    query: z.object({}),
});
