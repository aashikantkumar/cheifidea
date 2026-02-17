import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT, verifyChef } from "../middlewares/auth.middleware.js";
import {
    registerChef,
    loginChef,
    logoutChef,
    getChefProfile,
    updateChefProfile,
    addDish,
    updateDish,
    deleteDish,
    getChefDishes,
    getChefBookings,
    updateBookingStatus,
    getChefStats,
    toggleAvailability,
} from "../controllers/chef.controllers.js";

const router = Router();

// ─── Public Routes ─────────────────────────────────────────────
router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
        { name: "certificates", maxCount: 5 },
    ]),
    registerChef
);
router.route("/login").post(loginChef);

// ─── Protected Routes (Chef Only) ─────────────────────────────
router.route("/logout").post(verifyJWT, verifyChef, logoutChef);
router.route("/profile").get(verifyJWT, verifyChef, getChefProfile);
router.route("/profile/update").patch(verifyJWT, verifyChef, updateChefProfile);

// Dish Management
router.route("/dishes").get(verifyJWT, verifyChef, getChefDishes);
router.route("/dishes/add").post(
    verifyJWT,
    verifyChef,
    upload.array("images", 5),
    addDish
);
router.route("/dishes/:dishId").patch(verifyJWT, verifyChef, updateDish);
router.route("/dishes/:dishId").delete(verifyJWT, verifyChef, deleteDish);

// Booking Management
router.route("/bookings").get(verifyJWT, verifyChef, getChefBookings);
router
    .route("/bookings/:bookingId/status")
    .patch(verifyJWT, verifyChef, updateBookingStatus);

// Dashboard
router.route("/stats").get(verifyJWT, verifyChef, getChefStats);
router
    .route("/availability/toggle")
    .patch(verifyJWT, verifyChef, toggleAvailability);

export default router;
