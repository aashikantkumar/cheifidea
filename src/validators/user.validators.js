import { z } from "zod";
import {
    bookingStatusSchema,
    limitSchema,
    objectIdSchema,
    pageSchema,
} from "./common.validators.js";

const emailSchema = z.string().trim().email().toLowerCase();
const passwordSchema = z.string().min(8).max(128);

export const registerUserValidator = z.object({
    body: z.object({
        fullName: z.string().trim().min(1).max(120),
        email: emailSchema,
        username: z.string().trim().min(3).max(40).toLowerCase(),
        password: passwordSchema,
        phone: z.string().trim().min(7).max(20),
    }),
    params: z.object({}),
    query: z.object({}),
});

export const loginUserValidator = z.object({
    body: z.object({
        email: emailSchema,
        password: z.string().min(1),
    }),
    params: z.object({}),
    query: z.object({}),
});

export const refreshTokenValidator = z.object({
    body: z
        .object({
            refreshToken: z.string().trim().min(1).optional(),
        })
        .default({}),
    params: z.object({}),
    query: z.object({}),
});

export const changePasswordValidator = z.object({
    body: z.object({
        oldPassword: z.string().min(1),
        newPassword: passwordSchema,
    }),
    params: z.object({}),
    query: z.object({}),
});

export const updateUserProfileValidator = z.object({
    body: z
        .object({
            fullName: z.string().trim().min(1).max(120).optional(),
            phone: z.string().trim().min(7).max(20).optional(),
            address: z
                .object({
                    street: z.string().trim().max(200).optional(),
                    city: z.string().trim().max(100).optional(),
                    state: z.string().trim().max(100).optional(),
                    zipCode: z.string().trim().max(20).optional(),
                    country: z.string().trim().max(100).optional(),
                })
                .optional(),
        })
        .refine((payload) => Object.keys(payload).length > 0, {
            message: "At least one profile field is required",
        }),
    params: z.object({}),
    query: z.object({}),
});

export const userBookingsQueryValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({}),
    query: z.object({
        status: bookingStatusSchema.optional(),
        page: pageSchema,
        limit: limitSchema,
    }),
});

export const favoriteChefParamValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({
        chefId: objectIdSchema,
    }),
    query: z.object({}),
});
