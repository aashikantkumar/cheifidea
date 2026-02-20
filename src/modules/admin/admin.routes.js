import { Router } from "express";
import { verifyAdmin, verifyJWT } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { chefModerationParamValidator } from "../../validators/admin.validators.js";
import {
    approveChef,
    getPendingChefs,
    rejectChef,
    suspendChef,
} from "./admin.controller.js";

const router = Router();

router.route("/chefs/pending").get(verifyJWT, verifyAdmin, getPendingChefs);
router
    .route("/chefs/:chefId/approve")
    .patch(verifyJWT, verifyAdmin, validate(chefModerationParamValidator), approveChef);
router
    .route("/chefs/:chefId/reject")
    .patch(verifyJWT, verifyAdmin, validate(chefModerationParamValidator), rejectChef);
router
    .route("/chefs/:chefId/suspend")
    .patch(verifyJWT, verifyAdmin, validate(chefModerationParamValidator), suspendChef);

export default router;
