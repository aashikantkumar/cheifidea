import { Router } from "express";
import { verifyJWT, verifyUser } from "../middlewares/auth.middleware.js";
import {
    createBooking,
    getBookingById,
    cancelBooking,
    addReview,
} from "../controllers/booking.controllers.js";

const router = Router();

// create/cancel/review require a user account; getBookingById is shared (chef or user)
router.route("/create").post(verifyJWT, verifyUser, createBooking);
router.route("/:bookingId").get(verifyJWT, getBookingById);
router.route("/:bookingId/cancel").patch(verifyJWT, verifyUser, cancelBooking);
router.route("/:bookingId/review").post(verifyJWT, verifyUser, addReview);

export default router;
