import { z } from "zod";
import { objectIdSchema } from "./common.validators.js";

export const chefModerationParamValidator = z.object({
    body: z.object({}).default({}),
    params: z.object({
        chefId: objectIdSchema,
    }),
    query: z.object({}),
});
