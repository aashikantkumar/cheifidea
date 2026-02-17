import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createBooking,
    getBookingById,
    cancelBooking,
    addReview,
} from "../controllers/booking.controllers.js";

const router = Router();

// All routes require authentication
router.route("/create").post(verifyJWT, createBooking);
router.route("/:bookingId").get(verifyJWT, getBookingById);
router.route("/:bookingId/cancel").patch(verifyJWT, cancelBooking);
router.route("/:bookingId/review").post(verifyJWT, addReview);

export default router;
