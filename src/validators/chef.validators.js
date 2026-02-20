import { z } from "zod";
import {
    bookingStatusSchema,
    limitSchema,
    objectIdSchema,
    pageSchema,
} from "./common.validators.js";

const emailSchema = z.string().trim().email().toLowerCase();

export const registerChefValidator = z.object({
    body: z.object({
        fullName: z.string().trim().min(1).max(120),
        email: emailSchema,
        password: z.string().min(8).max(128),
        phone: z.string().trim().min(7).max(20),
        bio: z.string().max(500).optional(),
        specialization: z.union([z.string(), z.array(z.string())]).optional(),
        experience: z.coerce.number().min(0),
        pricePerHour: z.coerce.number().min(0),
        serviceLocations: z.union([z.string(), z.array(z.any())]).optional(),
    }),
    params: z.object({}),
    query: z.object({}),
});

export const loginChefValidator = z.object({
    body: z.object({
        email: emailSchema,
        password: z.string().min(1),
    }),
    params: z.object({}),
    query: z.object({}),
});

export const updateChefProfileValidator = z.object({
    body: z
        .object({
            fullName: z.string().trim().min(1).max(120).optional(),
            phone: z.string().trim().min(7).max(20).optional(),
            bio: z.string().max(500).optional(),
            specialization: z.array(z.string()).optional(),
            experience: z.coerce.number().min(0).optional(),
            pricePerHour: z.coerce.number().min(0).optional(),
            minimumBookingHours: z.coerce.number().int().min(1).optional(),
            serviceLocations: z.array(z.any()).optional(),
            workingHours: z.record(z.any()).optional(),
            bankDetails: z.record(z.any()).optional(),
            socialLinks: z.record(z.any()).optional(),
        })
        .refine((payload) => Object.keys(payload).length > 0, {
            message: "At least one profile field is required",
        }),
    params: z.object({}),
    query: z.object({}),
});

export const addDishValidator = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(1000),
        category: z.string().trim().min(1),
        cuisine: z.string().trim().min(1),
        preparationTime: z.coerce.number().min(1),
        cookingTime: z.coerce.number().min(1),
        servings: z.coerce.number().int().min(1).optional(),
        price: z.coerce.number().min(0),
        ingredients: z.union([z.string(), z.array(z.any())]).optional(),
        dietaryInfo: z.union([z.string(), z.record(z.any())]).optional(),
        tags: z.union([z.string(), z.array(z.string())]).optional(),
    }),
    params: z.object({}),
    query: z.object({}),
});

export const dishIdParamValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({ dishId: objectIdSchema }),
    query: z.object({}),
});

export const updateDishValidator = z.object({
    body: z
        .object({
            name: z.string().trim().min(1).max(120).optional(),
            description: z.string().trim().min(1).max(1000).optional(),
            category: z.string().trim().min(1).optional(),
            cuisine: z.string().trim().min(1).optional(),
            preparationTime: z.coerce.number().min(1).optional(),
            cookingTime: z.coerce.number().min(1).optional(),
            servings: z.coerce.number().int().min(1).optional(),
            price: z.coerce.number().min(0).optional(),
            ingredients: z.union([z.string(), z.array(z.any())]).optional(),
            dietaryInfo: z.union([z.string(), z.record(z.any())]).optional(),
            tags: z.union([z.string(), z.array(z.string())]).optional(),
            isAvailable: z.coerce.boolean().optional(),
            videoUrl: z.string().url().optional(),
        })
        .refine((payload) => Object.keys(payload).length > 0, {
            message: "At least one dish field is required",
        }),
    params: z.object({ dishId: objectIdSchema }),
    query: z.object({}),
});

export const chefDishesQueryValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({}),
    query: z.object({
        category: z.string().trim().optional(),
        isAvailable: z.coerce.boolean().optional(),
    }),
});

export const chefBookingsQueryValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({}),
    query: z.object({
        status: bookingStatusSchema.optional(),
        page: pageSchema,
        limit: limitSchema,
    }),
});

export const updateChefBookingStatusValidator = z.object({
    body: z.object({
        status: z.enum(["confirmed", "in-progress", "completed", "cancelled"]),
    }),
    params: z.object({
        bookingId: objectIdSchema,
    }),
    query: z.object({}),
});
