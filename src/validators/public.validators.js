import { z } from "zod";
import { limitSchema, objectIdSchema, pageSchema } from "./common.validators.js";

export const getAllChefsQueryValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({}),
    query: z.object({
        page: pageSchema.default(1),
        limit: limitSchema.default(12),
        sortBy: z
            .enum(["averageRating", "totalBookings", "pricePerHour", "createdAt"])
            .default("averageRating"),
        order: z.enum(["asc", "desc"]).default("desc"),
        city: z.string().trim().max(64).optional(),
        specialization: z.string().trim().max(120).optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        minRating: z.coerce.number().min(0).max(5).optional(),
    }),
});

export const searchChefsQueryValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({}),
    query: z.object({
        q: z.string().trim().min(1).max(64),
        page: pageSchema.default(1),
        limit: limitSchema.default(12),
    }),
});

export const chefIdParamValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({ chefId: objectIdSchema }),
    query: z.object({}),
});

export const chefDishesQueryValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({ chefId: objectIdSchema }),
    query: z.object({
        category: z.string().trim().optional(),
        cuisine: z.string().trim().optional(),
        vegetarian: z.coerce.boolean().optional(),
        page: pageSchema.default(1),
        limit: limitSchema.default(20),
    }),
});

export const dishIdParamValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({ dishId: objectIdSchema }),
    query: z.object({}),
});

export const searchDishesQueryValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({}),
    query: z.object({
        q: z.string().trim().max(64).optional(),
        category: z.string().trim().optional(),
        cuisine: z.string().trim().optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        vegetarian: z.coerce.boolean().optional(),
        vegan: z.coerce.boolean().optional(),
        spiceLevel: z.string().trim().optional(),
        page: pageSchema.default(1),
        limit: limitSchema.default(20),
    }),
});
